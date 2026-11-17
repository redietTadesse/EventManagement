package com.aicc.eventmanagement.controllers;
import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.security.*;
import com.aicc.eventmanagement.payload.JwtResponse;
import com.aicc.eventmanagement.exceptions.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/auth/google") @RequiredArgsConstructor
public class GoogleClientAuthController {
    private final GoogleTokenVerifier verifier;private final UserRepository users;
    private final PasswordEncoder encoder;private final JwtUtils jwt;
    public record Request(String credential,String nonce){}
    @GetMapping("/config") public Map<String,String> config(){return Map.of("clientId",verifier.clientId());}
    @PostMapping @Transactional public JwtResponse login(@RequestBody Request request){
        var identity=verifier.verify(request.credential(),request.nonce());
        User user=users.findByGoogleSubject(identity.subject()).orElse(null);
        if(user==null){
            if(users.existsByEmail(identity.email()))throw new BusinessException("This email already has an account. Sign in with its existing username and password.","EXISTING_ACCOUNT");
            user=User.builder().username("google_"+UUID.randomUUID()).email(identity.email())
                .fullName(identity.name()==null?identity.email():identity.name()).role(Role.CLIENT).isActive(true)
                .passwordHash(encoder.encode(UUID.randomUUID().toString())).googleSubject(identity.subject()).build();
            user=users.saveAndFlush(user);
        }
        if(user.getRole()!=Role.CLIENT||!user.isActive())throw new BusinessException("This account cannot use client Google sign-in.","ACCESS_DENIED");
        return new JwtResponse(jwt.generateJwtToken(user.getUsername(),"CLIENT"),"CLIENT");
    }
}
