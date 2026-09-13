package com.pulsopiura.platform.venues.infrastructure.persistence;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SportFormatCatalogRepository
        extends JpaRepository<SportFormatCatalogEntity, String> {
    List<SportFormatCatalogEntity> findAllByActiveTrueOrderBySportCodeAscNameAsc();

    boolean existsByCodeAndSportCodeAndActiveTrue(String code, String sportCode);
}
