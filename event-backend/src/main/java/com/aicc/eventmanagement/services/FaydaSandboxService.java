package com.aicc.eventmanagement.services;

import com.aicc.eventmanagement.exceptions.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigInteger;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.security.interfaces.RSAPrivateKey;
import java.security.spec.RSAPrivateKeySpec;
import java.security.spec.RSAPublicKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class FaydaSandboxService {
    private static final String HOST = "https://esignet.ida.fayda.et";
    private static final String TOKEN_ENDPOINT = HOST + "/v1/esignet/oauth/v2/token";
    private static final String PURPOSE = "aicc-fayda-sandbox-verification";
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final SecureRandom random = new SecureRandom();
    private final javax.crypto.SecretKey ticketKey = Jwts.SIG.HS256.key().build();

    @Value("${FAYDA_CLIENT_ID:}") private String clientId;
    @Value("${FAYDA_PRIVATE_JWK:}") private String privateJwk;
    @Value("${FAYDA_REDIRECT_URI:}") private String redirectUri;
    @Value("${FAYDA_ISSUER:}") private String issuer;
    @Value("${FAYDA_JWKS_URI:}") private String jwksUri;
    @Value("${FAYDA_ACR_VALUES:mosip:idp:acr:generated-code}") private String acrValues;
    @Value("${FAYDA_ASSERTION_AUDIENCE:}") private String assertionAudience;

    public FaydaSandboxService(ObjectMapper json) {
        this.json = json;
    }

    public record Journey(String authorizationUrl, String state, String ticket) {}

    public boolean enabled() {
        return !clientId.isBlank() && !privateJwk.isBlank() && !redirectUri.isBlank()
                && !issuer.isBlank() && jwksUri.startsWith("https://");
    }

    public Journey begin(String account) {
        requireEnabled();
        String state = randomValue();
        String nonce = randomValue();
        String verifier = randomValue();
        try {
            String challenge = encode(MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII)));
            String ticket = Jwts.builder().subject(account).issuer(PURPOSE)
                    .claim("state", state).claim("nonce", nonce).claim("verifier", verifier)
                    .expiration(Date.from(Instant.now().plusSeconds(600))).signWith(ticketKey).compact();
            String url = UriComponentsBuilder.fromUriString(HOST + "/authorize")
                    .queryParam("client_id", clientId).queryParam("redirect_uri", redirectUri)
                    .queryParam("response_type", "code").queryParam("scope", "openid")
                    .queryParam("state", state).queryParam("nonce", nonce)
                    .queryParam("acr_values", acrValues)
                    .queryParam("code_challenge", challenge).queryParam("code_challenge_method", "S256")
                    .build().encode().toUriString();
            return new Journey(url, state, ticket);
        } catch (Exception failure) {
            throw verificationFailed();
        }
    }

    public void verify(String account, String code, String state, String ticket) {
        requireEnabled();
        if (code == null || code.isBlank() || code.length() > 4096 || state == null || ticket == null || ticket.length() > 4096) {
            throw verificationFailed();
        }
        try {
            var attempt = Jwts.parser().verifyWith(ticketKey).requireIssuer(PURPOSE)
                    .requireSubject(account).require("state", state).build().parseSignedClaims(ticket).getPayload();
            String nonce = attempt.get("nonce", String.class);
            String verifier = attempt.get("verifier", String.class);
            JsonNode key = json.readTree(Base64.getDecoder().decode(privateJwk));
            var factory = KeyFactory.getInstance("RSA");
            var signer = (RSAPrivateKey) factory.generatePrivate(new RSAPrivateKeySpec(number(key, "n"), number(key, "d")));
            Instant now = Instant.now();
            String assertion = Jwts.builder().header().keyId(key.path("kid").asText()).and()
                    .issuer(clientId).subject(clientId)
                    .audience().add(assertionAudience.isBlank() ? TOKEN_ENDPOINT : assertionAudience).and()
                    .id(UUID.randomUUID().toString()).issuedAt(Date.from(now))
                    .expiration(Date.from(now.plusSeconds(60))).signWith(signer, Jwts.SIG.RS256).compact();
            String form = Map.of("grant_type", "authorization_code", "client_id", clientId, "code", code,
                            "redirect_uri", redirectUri, "code_verifier", verifier, "client_assertion", assertion,
                            "client_assertion_type", "urn:ietf:params:oauth:client-assertion-type:jwt-bearer")
                    .entrySet().stream().map(e -> e.getKey() + "=" + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
                    .collect(Collectors.joining("&"));
            JsonNode token = send(HttpRequest.newBuilder(URI.create(TOKEN_ENDPOINT)).timeout(Duration.ofSeconds(8))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form)).build());
            String idToken = token.path("id_token").asText();
            if (idToken.length() > 16000) throw new IllegalArgumentException();
            JsonNode header = json.readTree(Base64.getUrlDecoder().decode(idToken.split("\\.")[0]));
            if (!"RS256".equals(header.path("alg").asText()) || header.path("kid").asText().isBlank()) {
                throw new IllegalArgumentException();
            }
            JsonNode keys = send(HttpRequest.newBuilder(URI.create(jwksUri)).timeout(Duration.ofSeconds(5)).GET().build());
            for (JsonNode candidate : keys.path("keys")) {
                if (!"RSA".equals(candidate.path("kty").asText()) || !header.path("kid").equals(candidate.path("kid"))) continue;
                var publicKey = factory.generatePublic(new RSAPublicKeySpec(number(candidate, "n"), number(candidate, "e")));
                var claims = Jwts.parser().verifyWith(publicKey).requireIssuer(issuer).requireAudience(clientId)
                        .require("nonce", nonce).build().parseSignedClaims(idToken).getPayload();
                if (claims.getExpiration() == null || claims.getSubject() == null || claims.getSubject().isBlank()
                        || (claims.getAudience().size() > 1 || claims.containsKey("azp")) && !clientId.equals(claims.get("azp"))) {
                    throw new IllegalArgumentException();
                }
                return;
            }
        } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
        } catch (Exception failure) {
            // Provider bodies may contain identity data. Return a generic error.
        }
        throw verificationFailed();
    }

    private void requireEnabled() {
        if (!enabled()) throw new BusinessException("Fayda sandbox is not configured.", "FAYDA_DISABLED");
    }

    private BusinessException verificationFailed() {
        return new BusinessException("Fayda verification did not finish. Start a new check and try again.", "FAYDA_VERIFICATION_FAILED");
    }

    private JsonNode send(HttpRequest request) throws Exception {
        var response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) throw new IllegalArgumentException();
        return json.readTree(response.body());
    }

    private String randomValue() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return encode(bytes);
    }

    private static String encode(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static BigInteger number(JsonNode key, String name) {
        return new BigInteger(1, Base64.getUrlDecoder().decode(key.path(name).asText()));
    }
}
