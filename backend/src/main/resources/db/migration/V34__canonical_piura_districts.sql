-- Normalize only known district names; ambiguous neighborhoods remain available for manual review.
CREATE FUNCTION app.canonical_piura_district(value text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE lower(translate(regexp_replace(btrim(value), '\s+', ' ', 'g'), 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU'))
 WHEN 'piura' THEN 'Piura' WHEN 'castilla' THEN 'Castilla' WHEN 'catacaos' THEN 'Catacaos'
 WHEN 'cura mori' THEN 'Cura Mori' WHEN 'curamori' THEN 'Cura Mori'
 WHEN 'el tallan' THEN 'El Tallán' WHEN 'la arena' THEN 'La Arena' WHEN 'la union' THEN 'La Unión'
 WHEN 'las lomas' THEN 'Las Lomas' WHEN 'tambogrande' THEN 'Tambogrande' WHEN 'tambo grande' THEN 'Tambogrande'
 WHEN 'veintiseis de octubre' THEN 'Veintiséis de Octubre' WHEN '26 de octubre' THEN 'Veintiséis de Octubre'
 ELSE value END
$$;

-- The duplicate guards remain active. Skip any normalization that would create a location conflict.
UPDATE app.venues v SET district_code = app.canonical_piura_district(v.district_code)
WHERE district_code IS DISTINCT FROM app.canonical_piura_district(district_code)
AND NOT EXISTS (SELECT 1 FROM app.venues other WHERE other.id <> v.id AND other.status <> 'ARCHIVED'
 AND lower(regexp_replace(btrim(other.name), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(v.name), '\s+', ' ', 'g'))
 AND lower(regexp_replace(btrim(other.address), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(v.address), '\s+', ' ', 'g'))
 AND lower(other.district_code) = lower(app.canonical_piura_district(v.district_code)));

UPDATE app.organizations o SET district_code = app.canonical_piura_district(o.district_code)
WHERE district_code IS DISTINCT FROM app.canonical_piura_district(district_code)
AND NOT EXISTS (SELECT 1 FROM app.organizations other WHERE other.id <> o.id AND other.status = 'ACTIVE'
 AND lower(regexp_replace(btrim(other.name), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(o.name), '\s+', ' ', 'g'))
 AND lower(regexp_replace(btrim(other.address), '\s+', ' ', 'g')) = lower(regexp_replace(btrim(o.address), '\s+', ' ', 'g'))
 AND lower(other.district_code) = lower(app.canonical_piura_district(o.district_code)));
