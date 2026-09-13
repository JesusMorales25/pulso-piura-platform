package com.pulsopiura.platform.venues.infrastructure.persistence;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AmenityCatalogRepository extends JpaRepository<AmenityCatalogEntity, String> {
    List<AmenityCatalogEntity> findAllByActiveTrueOrderByNameAsc();

    List<AmenityCatalogEntity> findAllByCodeInAndActiveTrue(Collection<String> codes);
}
