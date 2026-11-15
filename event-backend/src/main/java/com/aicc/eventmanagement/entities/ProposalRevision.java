package com.aicc.eventmanagement.entities;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity @Table(name="proposal_revisions") @Getter @Setter @NoArgsConstructor
public class ProposalRevision {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    private Long inquiryId;
    private int revisionNumber;
    @Column(columnDefinition="LONGTEXT") private String proposalJson;
    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(columnDefinition="LONGTEXT") private String agreementArchive;
    private LocalDateTime createdAt;
}
