package com.pulsopiura.platform.shared;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;

class DistrictCatalogTest {
    @Test
    void recognizesVariantsWithoutAssigningNeighborhoods() {
        assertThat(DistrictCatalog.require(" CASTILLA ")).isEqualTo("Castilla");
        assertThat(DistrictCatalog.require("veintiseis   de octubre"))
                .isEqualTo("Veintiséis de Octubre");
        assertThat(DistrictCatalog.require("26 de octubre")).isEqualTo("Veintiséis de Octubre");
        assertThat(DistrictCatalog.canonical("Los Ejidos, Piura")).isNull();
        assertThatThrownBy(() -> DistrictCatalog.require("Los Ejidos"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(DistrictCatalog.NAMES).hasSize(10).doesNotHaveDuplicates();
    }
}
