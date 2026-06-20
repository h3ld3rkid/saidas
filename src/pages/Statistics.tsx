import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { displayExitType } from '@/lib/exitType';
import { BarChart3, MapPin, Users, Ambulance, Activity, UsersRound, Printer } from 'lucide-react';

type StatRow = {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  ambulance_number: string | null;
  departure_date: string;
  exit_type: string;
  crew: string | null;
  patient_district: string | null;
  patient_municipality: string | null;
  patient_parish: string | null;
  is_pem: boolean | null;
  is_reserve: boolean | null;
  status: string;
};

type PeopleMode = 'with-opcom' | 'without-opcom';

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const TYPE_COLORS: Record<string, string> = {
  'Emergência/CODU': 'hsl(0 84% 55%)',
  'Emergência Particular': 'hsl(142 70% 40%)',
  'VSL': 'hsl(217 91% 55%)',
  'Outro': 'hsl(220 9% 45%)',
};

const TYPE_KEYS = ['Emergência/CODU', 'Emergência Particular', 'VSL', 'Outro'];
const typeColor = (t: string) => TYPE_COLORS[t] || 'hsl(220 9% 45%)';

export default function Statistics() {
  const { hasRole, loading: roleLoading } = useUserRole();
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number | 'all'>(now.getMonth() + 1);
  const [rows, setRows] = useState<StatRow[]>([]);
  const [yearRows, setYearRows] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [vehicleNames, setVehicleNames] = useState<Record<string, string>>({});
  const [peopleMode, setPeopleMode] = useState<PeopleMode>('with-opcom');
  const [filterDistrict, setFilterDistrict] = useState<string>('all');
  const [filterMunicipality, setFilterMunicipality] = useState<string>('all');
  const [filterParish, setFilterParish] = useState<string>('all');

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y, y - 1, y - 2, y - 3];
  }, [now]);

  // Paginated RPC fetch (avoids PostgREST 1000-row cap)
  const fetchAllExits = async (p_year: number, p_month: number | null): Promise<StatRow[]> => {
    const pageSize = 1000;
    let start = 0;
    let all: StatRow[] = [];
    // hard safety cap: 50k rows
    for (let i = 0; i < 50; i++) {
      const { data, error } = await supabase
        .rpc('get_exits_for_stats', { p_year, p_month })
        .range(start, start + pageSize - 1);
      if (error) { console.error(error); break; }
      const chunk = (data || []) as StatRow[];
      all = all.concat(chunk);
      if (chunk.length < pageSize) break;
      start += pageSize;
    }
    return all;
  };

  // Load period data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchAllExits(year, month === 'all' ? null : (month as number));
      setRows(data);
      setLoading(false);
    };
    load();
  }, [year, month]);

  // Load full year for monthly comparison
  useEffect(() => {
    const load = async () => {
      const data = await fetchAllExits(year, null);
      setYearRows(data);
    };
    load();
  }, [year]);


  // Resolve user + vehicle labels from both datasets
  useEffect(() => {
    const userIds = new Set<string>();
    const vehicleIds = new Set<string>();
    [...rows, ...yearRows].forEach((r) => {
      if (r.user_id) userIds.add(r.user_id);
      if (r.crew) r.crew.split(',').map((s) => s.trim()).filter(Boolean).forEach((id) => userIds.add(id));
      if (r.vehicle_id) vehicleIds.add(r.vehicle_id);
    });
    if (userIds.size) {
      supabase.rpc('get_user_names_by_ids', { _user_ids: Array.from(userIds) }).then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach((u: any) => {
          const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Utilizador';
          map[u.user_id] = name;
        });
        setUserNames(map);
      });
    }
    if (vehicleIds.size) {
      supabase.from('vehicles').select('id, license_plate, ambulance_number').in('id', Array.from(vehicleIds)).then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach((v: any) => {
          map[v.id] = v.ambulance_number || v.license_plate || '—';
        });
        setVehicleNames(map);
      });
    }
  }, [rows, yearRows]);

  // Monthly comparison data (stacked by type) for the selected year
  const monthlyComparison = useMemo(() => {
    const buckets = MONTHS_SHORT.map((m) => {
      const base: any = { name: m, total: 0 };
      TYPE_KEYS.forEach((k) => (base[k] = 0));
      return base;
    });
    yearRows.forEach((r) => {
      const d = new Date(r.departure_date);
      const idx = d.getMonth();
      const t = displayExitType(r.exit_type || 'Outro');
      const key = TYPE_KEYS.includes(t) ? t : 'Outro';
      buckets[idx][key] += 1;
      buckets[idx].total += 1;
    });
    return buckets;
  }, [yearRows]);

  // Location filter options (derived from the full year, so they don't disappear)
  const locationOptions = useMemo(() => {
    const districts = new Set<string>();
    const municipalities = new Set<string>();
    const parishes = new Set<string>();
    yearRows.forEach((r) => {
      if (r.patient_district) districts.add(r.patient_district);
      if (r.patient_municipality && (filterDistrict === 'all' || r.patient_district === filterDistrict)) {
        municipalities.add(r.patient_municipality);
      }
      if (
        r.patient_parish &&
        (filterDistrict === 'all' || r.patient_district === filterDistrict) &&
        (filterMunicipality === 'all' || r.patient_municipality === filterMunicipality)
      ) {
        parishes.add(r.patient_parish);
      }
    });
    const sort = (s: Set<string>) => Array.from(s).sort((a, b) => a.localeCompare(b, 'pt'));
    return { districts: sort(districts), municipalities: sort(municipalities), parishes: sort(parishes) };
  }, [yearRows, filterDistrict, filterMunicipality]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterDistrict !== 'all' && r.patient_district !== filterDistrict) return false;
      if (filterMunicipality !== 'all' && r.patient_municipality !== filterMunicipality) return false;
      if (filterParish !== 'all' && r.patient_parish !== filterParish) return false;
      return true;
    });
  }, [rows, filterDistrict, filterMunicipality, filterParish]);

  const stats = useMemo(() => {
    const total = filteredRows.length;
    const byType = new Map<string, number>();
    const byDistrict = new Map<string, number>();
    const byMunicipality = new Map<string, number>();
    const byParish = new Map<string, number>();
    const byVehicle = new Map<string, number>();
    const byRegistrar = new Map<string, number>();
    const byCrewMember = new Map<string, number>();
    const byDay = new Map<string, number>();
    const byCrewSize = new Map<number, number>();
    const partnerships = new Map<string, { ids: [string, string]; count: number }>();
    let pem = 0;
    let reserve = 0;
    let completed = 0;
    const incompleteList: { id: string; date: string; type: string; missing: string[] }[] = [];
    const missingCounts = { vehicle: 0, crew: 0, location: 0 };


    filteredRows.forEach((r) => {
      const t = displayExitType(r.exit_type || 'Outro');
      byType.set(t, (byType.get(t) || 0) + 1);

      if (r.patient_district) byDistrict.set(r.patient_district, (byDistrict.get(r.patient_district) || 0) + 1);
      if (r.patient_municipality) byMunicipality.set(r.patient_municipality, (byMunicipality.get(r.patient_municipality) || 0) + 1);
      if (r.patient_parish) byParish.set(r.patient_parish, (byParish.get(r.patient_parish) || 0) + 1);

      const vKey = r.vehicle_id || r.ambulance_number || '—';
      byVehicle.set(vKey, (byVehicle.get(vKey) || 0) + 1);

      if (r.user_id) byRegistrar.set(r.user_id, (byRegistrar.get(r.user_id) || 0) + 1);

      const crewIds = (r.crew || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      crewIds.forEach((id) => byCrewMember.set(id, (byCrewMember.get(id) || 0) + 1));

      if (crewIds.length > 0) {
        byCrewSize.set(crewIds.length, (byCrewSize.get(crewIds.length) || 0) + 1);
      }

      // Pair combinations within the crew
      for (let i = 0; i < crewIds.length; i++) {
        for (let j = i + 1; j < crewIds.length; j++) {
          const a = crewIds[i];
          const b = crewIds[j];
          if (a === b) continue;
          const pair = [a, b].sort();
          const key = pair.join('|');
          const existing = partnerships.get(key);
          if (existing) existing.count++;
          else partnerships.set(key, { ids: [pair[0], pair[1]], count: 1 });
        }
      }

      byDay.set(r.departure_date, (byDay.get(r.departure_date) || 0) + 1);

      if (r.is_pem) pem++;
      if (r.is_reserve) reserve++;
      if (r.status === 'completed') completed++;
    });

    const toSortedArr = (m: Map<string, number>, top?: number) => {
      const arr = Array.from(m.entries()).map(([name, value]) => ({ name, value }));
      arr.sort((a, b) => b.value - a.value);
      return top ? arr.slice(0, top) : arr;
    };

    const daily = Array.from(byDay.entries())
      .map(([d, v]) => ({ name: d.slice(8, 10), value: v, date: d }))
      .sort((a, b) => a.date.localeCompare(b.date));

    let avgPerDayInPeriod = total / Math.max(1, byDay.size);
    if (month !== 'all') {
      const daysInMonth = new Date(year, month, 0).getDate();
      avgPerDayInPeriod = total / daysInMonth;
    } else {
      const isCurrentYear = year === now.getFullYear();
      const refDate = isCurrentYear ? now : new Date(year, 11, 31);
      const start = new Date(year, 0, 1);
      const days = Math.max(1, Math.ceil((refDate.getTime() - start.getTime()) / 86400000) + 1);
      avgPerDayInPeriod = total / days;
    }

    const crewSize = Array.from(byCrewSize.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([size, value]) => ({ name: `${size} elementos`, value }));

    const topPartnerships = Array.from(partnerships.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
      .map((p) => ({
        name: `${userNames[p.ids[0]] || 'Utilizador'} + ${userNames[p.ids[1]] || 'Utilizador'}`,
        value: p.count,
      }));

    // Combined people ranking: registrars + crew members
    const combinedPeopleMap = new Map<string, number>();
    byRegistrar.forEach((v, k) => combinedPeopleMap.set(k, (combinedPeopleMap.get(k) || 0) + v));
    byCrewMember.forEach((v, k) => combinedPeopleMap.set(k, (combinedPeopleMap.get(k) || 0) + v));
    const combinedPeople = toSortedArr(combinedPeopleMap, 15).map((v) => ({
      name: userNames[v.name] || 'Utilizador', value: v.value,
    }));

    return {
      total, pem, reserve, completed,
      avgPerDay: avgPerDayInPeriod,
      typeData: toSortedArr(byType),
      districts: toSortedArr(byDistrict, 10),
      municipalities: toSortedArr(byMunicipality, 10),
      parishes: toSortedArr(byParish, 15),
      vehicles: toSortedArr(byVehicle, 10).map((v) => ({
        name: vehicleNames[v.name] || v.name, value: v.value,
      })),
      registrars: toSortedArr(byRegistrar, 15).map((v) => ({
        name: userNames[v.name] || 'Utilizador', value: v.value,
      })),
      crewMembers: toSortedArr(byCrewMember, 15).map((v) => ({
        name: userNames[v.name] || 'Utilizador', value: v.value,
      })),
      combinedPeople,
      crewSize,
      topPartnerships,
      daily,
    };
  }, [filteredRows, year, month, userNames, vehicleNames, now]);

  if (!roleLoading && !hasRole('mod')) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Acesso restrito a moderadores e administradores.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Estatísticas
          </h1>
          <p className="text-sm text-muted-foreground">Análise detalhada dos serviços</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={String(month)} onValueChange={(v) => setMonth(v === 'all' ? 'all' : Number(v))}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Ano completo</SelectItem>
              {MONTHS_PT.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <button
            onClick={() => printReport({
              year, month, stats,
              filters: { district: filterDistrict, municipality: filterMunicipality, parish: filterParish },
              monthlyComparison,
            })}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90"
          >
            <Printer className="h-4 w-4" /> Imprimir relatório
          </button>
        </div>
      </div>

      {/* Location filters */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={filterDistrict}
          onValueChange={(v) => {
            setFilterDistrict(v);
            setFilterMunicipality('all');
            setFilterParish('all');
          }}
        >
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Distrito" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os distritos</SelectItem>
            {locationOptions.districts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={filterMunicipality}
          onValueChange={(v) => { setFilterMunicipality(v); setFilterParish('all'); }}
        >
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Concelho" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os concelhos</SelectItem>
            {locationOptions.municipalities.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterParish} onValueChange={setFilterParish}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Freguesia" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as freguesias</SelectItem>
            {locationOptions.parishes.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterDistrict !== 'all' || filterMunicipality !== 'all' || filterParish !== 'all') && (
          <button
            className="text-xs text-muted-foreground underline self-center"
            onClick={() => { setFilterDistrict('all'); setFilterMunicipality('all'); setFilterParish('all'); }}
          >
            Limpar filtros
          </button>
        )}
      </div>



      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard icon={<Activity className="h-4 w-4" />} label="Total serviços" value={stats.total} />
            <StatCard icon={<BarChart3 className="h-4 w-4" />} label="Média/dia" value={stats.avgPerDay.toFixed(1)} />
            <StatCard icon={<Ambulance className="h-4 w-4" />} label="Concluídos" value={stats.completed} />
            <StatCard icon={<Activity className="h-4 w-4" />} label="PEM" value={stats.pem} />
            <StatCard icon={<Ambulance className="h-4 w-4" />} label="Reserva" value={stats.reserve} />
          </div>

          {/* Monthly comparison – always visible */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comparação mensal — {year}</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  {TYPE_KEYS.map((k) => (
                    <Bar key={k} dataKey={k} stackId="a" fill={typeColor(k)} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Serviços por tipo</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.typeData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>
                      {stats.typeData.map((d) => (
                        <Cell key={d.name} fill={typeColor(d.name)} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Evolução diária</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.daily}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="locations">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
              <TabsTrigger value="locations" className="text-xs md:text-sm">
                <MapPin className="h-4 w-4 mr-1" />Localidades
              </TabsTrigger>
              <TabsTrigger value="people" className="text-xs md:text-sm">
                <Users className="h-4 w-4 mr-1" />Pessoas
              </TabsTrigger>
              <TabsTrigger value="crews" className="text-xs md:text-sm">
                <UsersRound className="h-4 w-4 mr-1" />Tripulações
              </TabsTrigger>
              <TabsTrigger value="vehicles" className="text-xs md:text-sm">
                <Ambulance className="h-4 w-4 mr-1" />Viaturas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="locations" className="space-y-4 mt-4">
              <RankingCard title="Top concelhos" data={stats.municipalities} />
              <RankingCard title="Top freguesias" data={stats.parishes} />
              <RankingCard title="Top distritos" data={stats.districts} />
            </TabsContent>

            <TabsContent value="people" className="space-y-4 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Select value={peopleMode} onValueChange={(v) => setPeopleMode(v as PeopleMode)}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="with-opcom">Com OPCOM (registou serviço)</SelectItem>
                    <SelectItem value="without-opcom">Sem OPCOM (só tripulação)</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  {peopleMode === 'with-opcom'
                    ? 'Inclui quem registou e quem fez parte da tripulação.'
                    : 'Apenas quem fez parte da tripulação, excluindo o registador.'}
                </span>
              </div>

              {peopleMode === 'with-opcom' ? (
                <RankingCard
                  title="Ranking — Total de participações (OPCOM + tripulação)"
                  data={stats.combinedPeople}
                />
              ) : (
                <RankingCard
                  title="Ranking — Tripulação (membros, sem OPCOM)"
                  data={stats.crewMembers}
                />
              )}
            </TabsContent>

            <TabsContent value="crews" className="space-y-4 mt-4">
              <RankingCard title="Distribuição por dimensão da tripulação" data={stats.crewSize} />
              <RankingCard title="Parcerias mais frequentes (dupla)" data={stats.topPartnerships} />
            </TabsContent>

            <TabsContent value="vehicles" className="space-y-4 mt-4">
              <RankingCard title="Top viaturas" data={stats.vehicles} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {icon}{label}
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function RankingCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  if (!data.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Sem dados no período.</CardContent>
      </Card>
    );
  }
  const height = Math.max(220, data.length * 30 + 40);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function printReport(opts: {
  year: number;
  month: number | 'all';
  stats: any;
  filters: { district: string; municipality: string; parish: string };
  monthlyComparison: any[];
}) {
  const { year, month, stats, filters, monthlyComparison } = opts;
  const periodo = month === 'all' ? `Ano ${year}` : `${MONTHS_PT[(month as number) - 1]} ${year}`;
  const filtroTxt = [
    filters.district !== 'all' ? `Distrito: ${filters.district}` : null,
    filters.municipality !== 'all' ? `Concelho: ${filters.municipality}` : null,
    filters.parish !== 'all' ? `Freguesia: ${filters.parish}` : null,
  ].filter(Boolean).join(' · ') || 'Sem filtros de localidade';

  const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
  const rankingTable = (title: string, data: { name: string; value: number }[]) => `
    <h3>${esc(title)}</h3>
    ${data.length === 0 ? '<p class="muted">Sem dados.</p>' : `
    <table><thead><tr><th>#</th><th>Nome</th><th class="num">Total</th></tr></thead><tbody>
    ${data.map((d, i) => `<tr><td>${i + 1}</td><td>${esc(d.name)}</td><td class="num">${d.value}</td></tr>`).join('')}
    </tbody></table>`}
  `;

  const monthlyTable = `
    <h3>Comparação mensal — ${year}</h3>
    <table><thead><tr><th>Mês</th>${TYPE_KEYS.map((k) => `<th class="num">${esc(k)}</th>`).join('')}<th class="num">Total</th></tr></thead><tbody>
    ${monthlyComparison.map((r) => `<tr><td>${esc(r.name)}</td>${TYPE_KEYS.map((k) => `<td class="num">${r[k] || 0}</td>`).join('')}<td class="num"><strong>${r.total}</strong></td></tr>`).join('')}
    </tbody></table>
  `;

  const html = `<!doctype html><html lang="pt"><head><meta charset="utf-8"/>
<title>Relatório de Estatísticas — ${esc(periodo)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, system-ui, Segoe UI, Roboto, sans-serif; color: #111; padding: 24px; }
  h1 { margin: 0 0 4px; font-size: 22px; }
  h2 { margin: 24px 0 8px; font-size: 16px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  h3 { margin: 16px 0 6px; font-size: 13px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
  .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 12px 0; }
  .kpi { border: 1px solid #ddd; border-radius: 6px; padding: 8px; }
  .kpi .l { font-size: 10px; color: #666; text-transform: uppercase; }
  .kpi .v { font-size: 18px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px; }
  th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; }
  th { background: #f4f4f4; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .muted { color: #888; font-size: 11px; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media print { body { padding: 12mm; } .noprint { display:none; } h2 { page-break-after: avoid; } table { page-break-inside: avoid; } }
  .btn { padding: 8px 14px; border: 0; background: #111; color: #fff; border-radius: 6px; cursor: pointer; }
</style></head><body>
  <div class="noprint" style="text-align:right;margin-bottom:12px;">
    <button class="btn" onclick="window.print()">Imprimir</button>
  </div>
  <h1>Relatório de Estatísticas</h1>
  <div class="meta">Período: <strong>${esc(periodo)}</strong> · ${esc(filtroTxt)} · Gerado em ${new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })}</div>

  <h2>Indicadores</h2>
  <div class="kpis">
    <div class="kpi"><div class="l">Total serviços</div><div class="v">${stats.total}</div></div>
    <div class="kpi"><div class="l">Média/dia</div><div class="v">${stats.avgPerDay.toFixed(1)}</div></div>
    <div class="kpi"><div class="l">Concluídos</div><div class="v">${stats.completed}</div></div>
    <div class="kpi"><div class="l">PEM</div><div class="v">${stats.pem}</div></div>
    <div class="kpi"><div class="l">Reserva</div><div class="v">${stats.reserve}</div></div>
  </div>

  <h2>Serviços por tipo</h2>
  ${rankingTable('Distribuição por tipo', stats.typeData)}

  <h2>Evolução</h2>
  ${monthlyTable}

  <h2>Localidades</h2>
  <div class="grid2">
    <div>${rankingTable('Top distritos', stats.districts)}</div>
    <div>${rankingTable('Top concelhos', stats.municipalities)}</div>
  </div>
  ${rankingTable('Top freguesias', stats.parishes)}

  <h2>Pessoas</h2>
  <div class="grid2">
    <div>${rankingTable('Ranking total (OPCOM + tripulação)', stats.combinedPeople)}</div>
    <div>${rankingTable('Ranking tripulação (sem OPCOM)', stats.crewMembers)}</div>
  </div>

  <h2>Tripulações</h2>
  <div class="grid2">
    <div>${rankingTable('Dimensão da tripulação', stats.crewSize)}</div>
    <div>${rankingTable('Parcerias mais frequentes', stats.topPartnerships)}</div>
  </div>

  <h2>Viaturas</h2>
  ${rankingTable('Top viaturas', stats.vehicles)}

  <script>setTimeout(() => window.print(), 400);</script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
