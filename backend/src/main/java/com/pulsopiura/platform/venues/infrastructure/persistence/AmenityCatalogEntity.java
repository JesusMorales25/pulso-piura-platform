package com.pulsopiura.platform.venues.infrastructure.persistence;

import jakarta.persistence.*;

@Entity
@Table(name = "amenities_catalog", schema = "app")
public class AmenityCatalogEntity {
    @Id
    @Column(length = 40)
    private String code;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false, length = 20)
    private String scope;

    @Column(nullable = false)
    private boolean active;

    protected AmenityCatalogEntity() {}

    public String code() {
        return code;
    }

    public String name() {
        return name;
    }

    public String scope() {
        return scope;
    }
}
