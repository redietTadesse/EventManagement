package com.aicc.eventmanagement.security;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.aicc.eventmanagement.exceptions.BusinessException;
import io.jsonwebtoken.Jwts;
import java.net.URI;
import java.net.http.*;
import java.security.PublicKey;
import java.security.cert.CertificateFactory;
import java.io.ByteArrayInputStream;
import java.time.*;
import java.util.*;

@Component
public class GoogleTokenVerifier {
    @Value("${GOOGLE_CLIENT_ID:${app.google.client-id:}}") private String clientId;
    private Map<String,PublicKey> keys=Map.of();
    private Instant cacheUntil=Instant.EPOCH;
    private Instant fetchedAt=Instant.EPOCH;
    public record Identity(String subject,String email,String name) {}
    public String clientId(){return clientId;}
    public Identity verify(String token,String nonce) {
        if(clientId==null||clientId.isBlank())throw new BusinessException("Google sign-in is not configured.","GOOGLE_DISABLED");
        try {
            if(token==null||token.length()>16000||nonce==null||nonce.length()<16)throw new IllegalArgumentException();
            var header=new ObjectMapper().readTree(Base64.getUrlDecoder().decode(token.split("\\.")[0]));
            if(!"RS256".equals(header.path("alg").asText()))throw new IllegalArgumentException();
            PublicKey key=key(header.path("kid").asText());
            var claims=Jwts.parser().verifyWith(key).requireAudience(clientId).require("nonce",nonce).build().parseSignedClaims(token).getPayload();
            if(!Set.of("accounts.google.com","https://accounts.google.com").contains(claims.getIssuer())
                ||claims.getExpiration()==null||claims.getSubject()==null||claims.getSubject().isBlank()
                ||!Boolean.TRUE.equals(claims.get("email_verified")))throw new IllegalArgumentException();
            String email=claims.get("email",String.class);if(email==null||email.isBlank())throw new IllegalArgumentException();
            return new Identity(claims.getSubject(),email,claims.get("name",String.class));
        }catch(Exception ex){throw new BusinessException("Google sign-in could not be verified. Try again or use your password.","INVALID_GOOGLE_TOKEN");}
    }
    private synchronized PublicKey key(String kid)throws Exception {
        Instant now=Instant.now();
        if(!cacheUntil.isAfter(now)||!keys.containsKey(kid)) {
            if(fetchedAt.plusSeconds(60).isAfter(now)&&!keys.containsKey(kid))throw new IllegalArgumentException();
            fetchedAt=now;
            var client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
            var response=client.send(HttpRequest.newBuilder(URI.create("https://www.googleapis.com/oauth2/v1/certs"))
                    .timeout(Duration.ofSeconds(5)).GET().build(),HttpResponse.BodyHandlers.ofString());
            if(response.statusCode()!=200)throw new IllegalStateException();
            Map<String,PublicKey> replacement=new HashMap<>();
            var fields=new ObjectMapper().readTree(response.body()).fields();
            while(fields.hasNext()){var item=fields.next();replacement.put(item.getKey(),CertificateFactory.getInstance("X.509")
                    .generateCertificate(new ByteArrayInputStream(item.getValue().asText().getBytes(java.nio.charset.StandardCharsets.US_ASCII))).getPublicKey());}
            keys=Map.copyOf(replacement);cacheUntil=now.plusSeconds(3600);
        }
        PublicKey key=keys.get(kid);if(key==null)throw new IllegalArgumentException();return key;
    }
}
