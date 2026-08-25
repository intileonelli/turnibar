-- I colori assegnati dalla migrazione precedente (0010) erano troppo simili tra loro per essere
-- distinti a colpo d'occhio (es. due tonalità di indaco quasi identiche). Li si riassegna con una
-- palette che alterna tonalità e luminosità, così due dipendenti creati in sequenza (i più
-- probabili ad apparire fianco a fianco nel calendario) risultano sempre ben distinguibili.
with numbered as (
  select id, row_number() over (partition by company_id order by id) - 1 as idx
  from employees
)
update employees e
set color = (array[
  '#CA2121', '#8F491E', '#CAA021', '#818F1E', '#75CA21', '#2C8F1E', '#21CA4B', '#1E8F65',
  '#21CACA', '#1E658F', '#214BCA', '#2C1E8F', '#7521CA', '#811E8F', '#CA21A0', '#8F1E49'
])[(n.idx % 16) + 1]
from numbered n
where n.id = e.id;
