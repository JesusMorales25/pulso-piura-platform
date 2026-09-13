package com.pulsopiura.platform.venues.infrastructure.persistence;

import jakarta.persistence.*;

@Entity
@Table(name = "sport_formats_catalog", schema = "app")
public class SportFormatCatalogEntity {
    @Id
    @Column(length = 40)
    private String code;

    @Column(name = "sport_code", nullable = false, length = 40)
    private String sportCode;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(name = "recommended_capacity")
    private Integer recommendedCapacity;

    @Column(nullable = false)
    private boolean active;

    protected SportFormatCatalogEntity() {}

    public String code() {
        return code;
    }

    public String sportCode() {
        return sportCode;
    }

    public String name() {
        return name;
    }

    public Integer recommendedCapacity() {
        return recommendedCapacity;
    }
}
