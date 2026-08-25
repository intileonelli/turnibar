-- Colore personale per ogni dipendente (usato nel calendario turni al posto del colore del
-- ruolo, per distinguere subito i dipendenti anche quando condividono lo stesso ruolo).
-- Assegnato automaticamente ciclando su una palette fissa, come già avviene lato client per i
-- nuovi dipendenti creati da questo punto in poi (vedi employeeRepository.createEmployee).
alter table employees add column color text;

with numbered as (
  select id, row_number() over (partition by company_id order by id) - 1 as idx
  from employees
)
update employees e
set color = (array[
  '#4F46E5', '#0EA5E9', '#16A34A', '#D97706', '#DB2777', '#7C3AED', '#DC2626', '#0D9488',
  '#CA8A04', '#059669', '#2563EB', '#C026D3', '#EA580C', '#4338CA', '#0891B2', '#BE123C'
])[(n.idx % 16) + 1]
from numbered n
where n.id = e.id;

alter table employees alter column color set not null;
