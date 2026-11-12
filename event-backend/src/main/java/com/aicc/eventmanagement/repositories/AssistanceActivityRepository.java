
package com.aicc.eventmanagement.repositories;
import com.aicc.eventmanagement.entities.AssistanceActivity;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.domain.*;
import java.util.List;
public interface AssistanceActivityRepository extends JpaRepository<AssistanceActivity, Long> {
 @Query("select a from AssistanceActivity a, Inquiry i where a.inquiryId = i.id and i.coordinator.username = :username order by a.createdAt desc, a.id desc")
 List<AssistanceActivity> recent(@org.springframework.data.repository.query.Param("username") String username, Pageable pageable);
}
