package com.aicc.eventmanagement.listeners;

import com.aicc.eventmanagement.services.PasswordRecoveryService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component @RequiredArgsConstructor
public class PasswordRecoveryListener {
    private final PasswordRecoveryService recovery;
    @Async @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void requested(PasswordRecoveryService.Requested request) { recovery.sendLink(request.email()); }
}
