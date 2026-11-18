package com.aicc.eventmanagement.repositories;
import com.aicc.eventmanagement.entities.ProposalRevision;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ProposalRevisionRepository extends JpaRepository<ProposalRevision,Long> {
    List<ProposalRevision> findByInquiryIdOrderByRevisionNumberDesc(Long id);
}
