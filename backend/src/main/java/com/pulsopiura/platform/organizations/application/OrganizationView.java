package com.pulsopiura.platform.organizations.application;

import java.util.UUID;

public record OrganizationView(
        UUID id, String name, String slug, String status, String timezone, String role) {}
