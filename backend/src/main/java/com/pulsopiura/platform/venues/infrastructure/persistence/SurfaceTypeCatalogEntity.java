package com.pulsopiura.platform.venues.infrastructure.persistence;

import jakarta.persistence.*;

@Entity
@Table(name = "surface_types_catalog", schema = "app")
public class SurfaceTypeCatalogEntity {
    @Id
    @Column(length = 40)
    private String code;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false)
    private boolean active;

    protected SurfaceTypeCatalogEntity() {}

    public String code() {
        return code;
    }

    public String name() {
        return name;
    }
}
