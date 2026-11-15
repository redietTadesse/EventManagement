package com.aicc.eventmanagement.services;
import org.junit.jupiter.api.Test;
import com.aicc.eventmanagement.controllers.GoogleClientAuthController;
import com.aicc.eventmanagement.security.*;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.enums.Role;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.assertj.core.api.Assertions.*;
class GoogleClientAuthControllerTest {
 @Test void createsOnlyClientsAndNeverLinksAnExistingEmailAutomatically(){
  var verifier=mock(GoogleTokenVerifier.class);var users=mock(UserRepository.class);
  var encoder=mock(PasswordEncoder.class);var jwt=mock(JwtUtils.class);
  var controller=new GoogleClientAuthController(verifier,users,encoder,jwt);
  when(verifier.verify("token","browser-nonce")).thenReturn(new GoogleTokenVerifier.Identity("sub","client@example.test","Demo Client"));
  when(users.findByGoogleSubject("sub")).thenReturn(Optional.empty());
  when(encoder.encode(anyString())).thenReturn("hashed-random-password");
  when(users.saveAndFlush(any())).thenAnswer(invocation->{User user=invocation.getArgument(0);assertThat(user.getRole()).isEqualTo(Role.CLIENT);assertThat(user.getGoogleSubject()).isEqualTo("sub");return user;});
  when(jwt.generateJwtToken(anyString(),eq("CLIENT"))).thenReturn("application-token");
  assertThat(controller.login(new GoogleClientAuthController.Request("token","browser-nonce")).getAccessToken()).isEqualTo("application-token");
  when(users.existsByEmail("client@example.test")).thenReturn(true);
  assertThatThrownBy(()->controller.login(new GoogleClientAuthController.Request("token","browser-nonce"))).hasMessageContaining("existing username");
  when(users.findByGoogleSubject("sub")).thenReturn(Optional.of(User.builder().role(Role.ADMIN).isActive(true).build()));
  assertThatThrownBy(()->controller.login(new GoogleClientAuthController.Request("token","browser-nonce"))).hasMessageContaining("cannot use client");
 }
}
