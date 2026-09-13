package com.pulsopiura.platform.venues.infrastructure.persistence;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SurfaceTypeCatalogRepository
        extends JpaRepository<SurfaceTypeCatalogEntity, String> {
    List<SurfaceTypeCatalogEntity> findAllByActiveTrueOrderByNameAsc();

    boolean existsByCodeAndActiveTrue(String code);
}
