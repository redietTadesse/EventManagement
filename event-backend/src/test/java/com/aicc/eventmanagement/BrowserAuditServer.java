package com.aicc.eventmanagement;

import com.aicc.eventmanagement.entities.User;
import com.aicc.eventmanagement.entities.Vendor;
import com.aicc.eventmanagement.entities.Venue;
import com.aicc.eventmanagement.enums.Role;
import com.aicc.eventmanagement.repositories.UserRepository;
import com.aicc.eventmanagement.repositories.VendorRepository;
import com.aicc.eventmanagement.repositories.VenueRepository;
import org.springframework.boot.SpringApplication;
import org.springframework.security.crypto.password.PasswordEncoder;

import javax.sql.DataSource;
import java.time.LocalDate;

/** Disposable browser-test server; never connects to the application's MySQL database. */
public class BrowserAuditServer {
    public static void main(String[] args) throws Exception {
        System.setProperty("spring.devtools.restart.enabled", "false");
        SpringApplication app = new SpringApplication(EventmanagementApplication.class);
        var context = app.run("--spring.profiles.active=test", "--server.port=18081",
                "--spring.datasource.url=jdbc:h2:mem:browser-audit;DB_CLOSE_DELAY=-1",
                "--spring.datasource.driver-class-name=org.h2.Driver", "--spring.datasource.username=sa",
                "--spring.datasource.password=", "--spring.jpa.hibernate.ddl-auto=create-drop",
                "--spring.flyway.enabled=false", "--spring.jpa.open-in-view=false", "--app.email.enabled=false",
                "--jwt.secret=browser-audit-only-secret-at-least-32-characters",
                "--cors.allowed-origins=http://localhost:5174", "--app.base-url=http://localhost:5174");
        try (var connection = context.getBean(DataSource.class).getConnection()) {
            if (!connection.getMetaData().getURL().startsWith("jdbc:h2:mem:browser-audit")) {
                context.close();
                throw new IllegalStateException("Browser audit requires its isolated in-memory database");
            }
        }
        var users = context.getBean(UserRepository.class);
        var vendors = context.getBean(VendorRepository.class);
        var encoder = context.getBean(PasswordEncoder.class);
        for (Role role : new Role[]{Role.ADMIN, Role.COORDINATOR, Role.CLIENT, Role.VENDOR}) {
            var user = users.save(User.builder().username(role.name().toLowerCase())
                    .email(role.name().toLowerCase() + "@audit.example.test").fullName("Audit " + role.name())
                    .passwordHash(encoder.encode("Admin@123")).role(role).isActive(true).build());
            if (role == Role.VENDOR) vendors.save(Vendor.builder().userId(user.getId())
                    .companyName("Audit AV").serviceCategory("av").email(user.getEmail()).rating(4.5)
                    .insuranceExpiryDate(LocalDate.now().plusYears(3)).isActive(true).build());
        }
        context.getBean(VenueRepository.class).save(Venue.builder().name("Audit Hall").capacity(500)
                .hourlyRate(new java.math.BigDecimal("1000")).setupBufferDays(1).teardownBufferDays(1)
                .active(true).build());
        System.out.println("BROWSER AUDIT READY: isolated H2 on port 18081; demo logins use Admin@123");
    }
}
