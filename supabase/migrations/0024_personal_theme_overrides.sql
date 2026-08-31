-- Ogni account (titolare o dipendente) può ora personalizzare colori/sfondo/motivo/ombre solo
-- per sé, sovrascrivendo il tema base dell'azienda: stesso meccanismo già usato per dimensione e
-- colore del testo (colonne su profiles, coperte dalla policy "update_own_profile" già esistente,
-- non serve una nuova regola). Non impostate = nessuna preferenza personale, resta il tema
-- dell'azienda scelto dal titolare in shop_settings.
alter table profiles add column theme_primary_color text;
alter table profiles add column theme_accent_color text;
alter table profiles add column theme_background_color text;
alter table profiles add column theme_background_opacity integer;
alter table profiles add column theme_shadow_intensity integer;
alter table profiles add column theme_background_pattern text;
alter table profiles add column theme_pattern_color_1 text;
alter table profiles add column theme_pattern_color_2 text;
