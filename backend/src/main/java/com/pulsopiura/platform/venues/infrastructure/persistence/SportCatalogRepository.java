package com.pulsopiura.platform.venues.infrastructure.persistence;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SportCatalogRepository extends JpaRepository<SportCatalogEntity, String> {
    List<SportCatalogEntity> findAllByActiveTrueOrderByNameAsc();

    boolean existsByCodeAndActiveTrue(String code);
}
