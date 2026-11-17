package com.aicc.eventmanagement.services;
import org.junit.jupiter.api.Test;
import com.aicc.eventmanagement.security.GoogleTokenVerifier;
import org.springframework.test.util.ReflectionTestUtils;
import io.jsonwebtoken.Jwts;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
class GoogleTokenVerifierTest {
 @Test void verifiesSignatureAudienceIssuerExpiryEmailAndNonceWithoutNetwork(){
  var pair=Jwts.SIG.RS256.keyPair().build();var verifier=new GoogleTokenVerifier();
  ReflectionTestUtils.setField(verifier,"clientId","test-client");
  ReflectionTestUtils.setField(verifier,"keys",Map.of("test-key",pair.getPublic()));
  ReflectionTestUtils.setField(verifier,"cacheUntil",Instant.now().plusSeconds(300));
  String nonce="test-browser-nonce-12345";
  String token=Jwts.builder().header().keyId("test-key").and().subject("google-subject")
   .issuer("https://accounts.google.com").audience().add("test-client").and()
   .claim("email","demo@example.test").claim("email_verified",true).claim("nonce",nonce)
   .expiration(Date.from(Instant.now().plusSeconds(100))).signWith(pair.getPrivate(),Jwts.SIG.RS256).compact();
  assertThat(verifier.verify(token,nonce).subject()).isEqualTo("google-subject");
  assertThatThrownBy(()->verifier.verify(token,"another-browser-nonce")).hasMessageContaining("could not be verified");
  ReflectionTestUtils.setField(verifier,"clientId","wrong-client");
  assertThatThrownBy(()->verifier.verify(token,nonce)).hasMessageContaining("could not be verified");
 }
}
