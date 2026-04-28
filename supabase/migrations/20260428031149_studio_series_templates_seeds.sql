-- F14.F.9 Sprint 8 BIBLIA — seed 4 templates canon desarrolladora.
-- narrative_arc shape: array de objetos {episode_number, phase, suggested_title, suggested_duration_sec, key_visuals[]}.

insert into public.studio_series_templates (slug, name, category, description, default_total_episodes, narrative_arc, visual_style, music_theme_mood, thumbnail_storage_path)
values
  (
    'residencial-clasico',
    'Residencial Clasico',
    'residencial',
    'Serie 5 episodios para desarrollos residenciales: planificacion, construccion, acabados, amenidades, entrega.',
    5,
    '[
      {"episode_number":1,"phase":"planificacion","suggested_title":"El Sueno: Vision del Proyecto","suggested_duration_sec":60,"key_visuals":["maqueta","render_aereo","planos_arquitectonicos"]},
      {"episode_number":2,"phase":"construccion","suggested_title":"Cimientos y Estructura","suggested_duration_sec":75,"key_visuals":["obra_negra","grua","armado_acero"]},
      {"episode_number":3,"phase":"acabados","suggested_title":"Detalles que Marcan la Diferencia","suggested_duration_sec":75,"key_visuals":["cocina_marmol","banos_acabados","pisos"]},
      {"episode_number":4,"phase":"amenidades","suggested_title":"Vivir Mejor: Areas Comunes","suggested_duration_sec":60,"key_visuals":["alberca","gym","lobby","areas_verdes"]},
      {"episode_number":5,"phase":"entrega","suggested_title":"Bienvenida a Casa","suggested_duration_sec":90,"key_visuals":["unidad_lista","tour_completo","testimonios_clientes"]}
    ]'::jsonb,
    '{"style_template":"luxury_clean","color_grade":"warm_natural","transitions":"fade_smooth"}'::jsonb,
    'cinematic_uplifting',
    'series-templates/residencial-clasico.jpg'
  ),
  (
    'residencial-premium',
    'Residencial Premium',
    'residencial',
    'Serie 7 episodios premium con episodio diseno + open house. Para desarrollos high-end.',
    7,
    '[
      {"episode_number":1,"phase":"planificacion","suggested_title":"Vision Arquitectonica","suggested_duration_sec":60,"key_visuals":["render_aereo","maqueta","masterplan"]},
      {"episode_number":2,"phase":"custom","suggested_title":"El Diseno: Inspiracion y Concepto","suggested_duration_sec":75,"key_visuals":["arquitecto_entrevista","moodboard","render_interior"]},
      {"episode_number":3,"phase":"construccion","suggested_title":"Construyendo el Futuro","suggested_duration_sec":75,"key_visuals":["obra_negra","grua","drone_aerial"]},
      {"episode_number":4,"phase":"acabados","suggested_title":"Lujo en cada Detalle","suggested_duration_sec":90,"key_visuals":["acabados_premium","cocina_chef","walk_in_closet"]},
      {"episode_number":5,"phase":"amenidades","suggested_title":"Amenidades Exclusivas","suggested_duration_sec":75,"key_visuals":["spa","sky_lounge","wine_cellar","cinema"]},
      {"episode_number":6,"phase":"custom","suggested_title":"Open House Privado","suggested_duration_sec":90,"key_visuals":["evento","clientes_vip","tour_guiado"]},
      {"episode_number":7,"phase":"entrega","suggested_title":"Donde la Vida Sucede","suggested_duration_sec":120,"key_visuals":["familia_disfrutando","unidad_amueblada","testimonios"]}
    ]'::jsonb,
    '{"style_template":"luxury_dramatic","color_grade":"cinematic_amber","transitions":"dramatic_fade"}'::jsonb,
    'orchestral_grand',
    'series-templates/residencial-premium.jpg'
  ),
  (
    'comercial-oficinas',
    'Comercial Oficinas',
    'comercial',
    'Serie 4 episodios para desarrollos comerciales/corporativos: estructura, interiores, amenidades, entrega.',
    4,
    '[
      {"episode_number":1,"phase":"planificacion","suggested_title":"Construyendo Productividad","suggested_duration_sec":60,"key_visuals":["masterplan","render_corporativo","ubicacion_estrategica"]},
      {"episode_number":2,"phase":"construccion","suggested_title":"Estructura para los Lideres","suggested_duration_sec":75,"key_visuals":["obra_negra","fachada","drone_aerial"]},
      {"episode_number":3,"phase":"acabados","suggested_title":"Espacios que Inspiran","suggested_duration_sec":75,"key_visuals":["interiores_oficina","lobby_corporativo","cristales_ventanas"]},
      {"episode_number":4,"phase":"entrega","suggested_title":"Tu Empresa Aqui","suggested_duration_sec":90,"key_visuals":["amenidades_corp","sala_juntas","gym_ejecutivo","empresarios_trabajando"]}
    ]'::jsonb,
    '{"style_template":"corporate_modern","color_grade":"clean_neutral","transitions":"sharp_cut"}'::jsonb,
    'corporate_progressive',
    'series-templates/comercial-oficinas.jpg'
  ),
  (
    'mixto-residencial-comercial',
    'Mixto Residencial + Comercial',
    'mixto',
    'Serie 6 episodios desarrollos uso mixto: master plan, residencial, comercial, amenidades comunes, entrega.',
    6,
    '[
      {"episode_number":1,"phase":"planificacion","suggested_title":"Una Comunidad Completa","suggested_duration_sec":75,"key_visuals":["masterplan","render_aereo","concepto_mixto"]},
      {"episode_number":2,"phase":"construccion","suggested_title":"Cimientos del Futuro","suggested_duration_sec":75,"key_visuals":["obra_negra","grua","drone_construccion"]},
      {"episode_number":3,"phase":"custom","suggested_title":"Vivir: Componente Residencial","suggested_duration_sec":75,"key_visuals":["torre_residencial","unidad_familiar","areas_verdes"]},
      {"episode_number":4,"phase":"custom","suggested_title":"Trabajar y Comprar: Componente Comercial","suggested_duration_sec":75,"key_visuals":["plaza_comercial","oficinas","locales"]},
      {"episode_number":5,"phase":"amenidades","suggested_title":"El Punto de Encuentro","suggested_duration_sec":75,"key_visuals":["plaza_central","areas_comunes","actividades_familia"]},
      {"episode_number":6,"phase":"entrega","suggested_title":"Tu Vida en un Solo Lugar","suggested_duration_sec":120,"key_visuals":["tour_completo","clientes_disfrutando","testimonios"]}
    ]'::jsonb,
    '{"style_template":"vibrant_community","color_grade":"warm_lifestyle","transitions":"smooth_blend"}'::jsonb,
    'lifestyle_optimistic',
    'series-templates/mixto-residencial-comercial.jpg'
  )
on conflict (slug) do nothing;
