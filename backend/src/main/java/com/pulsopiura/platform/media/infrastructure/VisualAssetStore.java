package com.pulsopiura.platform.media.infrastructure;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class VisualAssetStore {
    private final JdbcTemplate jdbc;

    public VisualAssetStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<String> slots() {
        return jdbc.queryForList(
                "select slot from app.platform_visual_assets order by slot", String.class);
    }

    public Optional<String> key(String slot) {
        return jdbc
                .queryForList(
                        "select storage_key from app.platform_visual_assets where slot = ?",
                        String.class,
                        slot)
                .stream()
                .findFirst();
    }

    public void lock(String slot) {
        jdbc.queryForObject(
                "select pg_advisory_xact_lock(hashtextextended(?, 0))",
                Object.class,
                "platform-visual-asset:" + slot);
    }

    public void put(String slot, String key) {
        jdbc.update(
                "insert into app.platform_visual_assets(slot,storage_key) values (?,?) on conflict(slot) do update set storage_key=excluded.storage_key, updated_at=now()",
                slot,
                key);
    }

    public void delete(String slot) {
        jdbc.update("delete from app.platform_visual_assets where slot = ?", slot);
    }
}
