package com.aicc.eventmanagement.payload;

import lombok.Data;

import java.util.List;

@Data
public class ConfirmCategoriesRequest {
    private List<String> categories;
}
