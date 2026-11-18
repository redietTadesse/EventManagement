
package com.aicc.eventmanagement.entities;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
@Entity @Table(name = "assistance_activity") @Getter @Setter
public class AssistanceActivity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @Column(nullable=false) private Long inquiryId;
 private Long eventId;
 @Column(nullable=false,length=30) private String category;
 @Column(nullable=false) private String title;
 @Column(nullable=false,length=1000) private String detail;
 private boolean needsAttention;
 @Column(nullable=false) private Instant createdAt;
}
