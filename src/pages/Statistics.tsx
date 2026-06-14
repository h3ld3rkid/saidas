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
import { normalizeExitType, displayExitType } from '@/lib/exitType';
import { BarChart3, MapPin, Users, Ambulance, Activity } from 'lucide-react';

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

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const TYPE_COLORS: Record<string, string> = {
  'Emergência/CODU': 'hsl(0 84% 55%)',
  'Emergência Particular': 'hsl(142 70% 40%)',
  'VSL': 'hsl(217 91% 55%)',
  'Outro': 'hsl(220 9% 45%)',
};

const typeColor = (t: string) => TYPE_COLORS[t] || 'hsl(220 9% 45%)';

export default function Statistics() {
  const { hasRole, loading: roleLoading } = useUserRole();
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number | 'all'>(now.getMonth() + 1);
  const [rows, setRows] = useState<StatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [vehicleNames, setVehicleNames] = useState<Record<string, string>>({});

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y, y - 1, y - 2, y - 3];
  }, [now]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_exits_for_stats', {
        p_year: year,
        p_month: month === 'all' ? null : month,
      });
      if (error) {
        console.error(error);
        setRows([]);
      } else {
        setRows((data || []) as StatRow[]);
      }
      setLoading(false);
    };
    load();
  }, [year, month]);

  // Collect user IDs (registrar + crew) and vehicle IDs
  useEffect(() => {
    const userIds = new Set<string>();
    const vehicleIds = new Set<string>();
    rows.forEach((r) => {
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
      supabase.from('vehicles').select('id, license_plate, name').in('id', Array.from(vehicleIds)).then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach((v: any) => {
          map[v.id] = v.license_plate || v.name || '—';
        });
        setVehicleNames(map);
      });
    }
  }, [rows]);

  const stats = useMemo(() => {
    const total = rows.length;
    const byType = new Map<string, number>();
    const byDistrict = new Map<string, number>();
    const byMunicipality = new Map<string, number>();
    const byParish = new Map<string, number>();
    const byVehicle = new Map<string, number>();
    const byRegistrar = new Map<string, number>();
    const byCrewMember = new Map<string, number>();
    const byDay = new Map<string, number>();
    let pem = 0;
    let reserve = 0;
    let completed = 0;

    rows.forEach((r) => {
      const t = displayExitType(r.exit_type || 'Outro');
      byType.set(t, (byType.get(t) || 0) + 1);

      if (r.patient_district) byDistrict.set(r.patient_district, (byDistrict.get(r.patient_district) || 0) + 1);
      if (r.patient_municipality) byMunicipality.set(r.patient_municipality, (byMunicipality.get(r.patient_municipality) || 0) + 1);
      if (r.patient_parish) byParish.set(r.patient_parish, (byParish.get(r.patient_parish) || 0) + 1);

      const vKey = r.vehicle_id || r.ambulance_number || '—';
      byVehicle.set(vKey, (byVehicle.get(vKey) || 0) + 1);

      if (r.user_id) byRegistrar.set(r.user_id, (byRegistrar.get(r.user_id) || 0) + 1);

      if (r.crew) {
        r.crew.split(',').map((s) => s.trim()).filter(Boolean).forEach((id) => {
          byCrewMember.set(id, (byCrewMember.get(id) || 0) + 1);
        });
      }

      const day = r.departure_date;
      byDay.set(day, (byDay.get(day) || 0) + 1);

      if (r.is_pem) pem++;
      if (r.is_reserve) reserve++;
      if (r.status === 'completed') completed++;
    });

    const toSortedArr = (m: Map<string, number>, top?: number) => {
      const arr = Array.from(m.entries()).map(([name, value]) => ({ name, value }));
      arr.sort((a, b) => b.value - a.value);
      return top ? arr.slice(0, top) : arr;
    };

    // Daily series for the month
    const daily = Array.from(byDay.entries())
      .map(([d, v]) => ({ name: d.slice(8, 10), value: v, date: d }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Averages
    const uniqueDays = byDay.size || 1;
    const avgPerDay = total / uniqueDays;

    let avgPerDayInPeriod = avgPerDay;
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

    return {
      total,
      pem,
      reserve,
      completed,
      avgPerDay: avgPerDayInPeriod,
      typeData: toSortedArr(byType),
      districts: toSortedArr(byDistrict, 10),
      municipalities: toSortedArr(byMunicipality, 10),
      parishes: toSortedArr(byParish, 15),
      vehicles: toSortedArr(byVehicle, 10).map((v) => ({
        name: vehicleNames[v.name] || v.name,
        value: v.value,
      })),
      registrars: toSortedArr(byRegistrar, 15).map((v) => ({
        name: userNames[v.name] || 'Utilizador',
        value: v.value,
      })),
      crewMembers: toSortedArr(byCrewMember, 15).map((v) => ({
        name: userNames[v.name] || 'Utilizador',
        value: v.value,
      })),
      daily,
    };
  }, [rows, year, month, userNames, vehicleNames, now]);

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
        <div className="flex gap-2">
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
        </div>
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="locations"><MapPin className="h-4 w-4 mr-1" />Localidades</TabsTrigger>
              <TabsTrigger value="people"><Users className="h-4 w-4 mr-1" />Pessoas</TabsTrigger>
              <TabsTrigger value="vehicles"><Ambulance className="h-4 w-4 mr-1" />Viaturas</TabsTrigger>
            </TabsList>

            <TabsContent value="locations" className="space-y-4 mt-4">
              <RankingCard title="Top concelhos" data={stats.municipalities} />
              <RankingCard title="Top freguesias" data={stats.parishes} />
              <RankingCard title="Top distritos" data={stats.districts} />
            </TabsContent>

            <TabsContent value="people" className="space-y-4 mt-4">
              <RankingCard title="Ranking — Registou serviço" data={stats.registrars} />
              <RankingCard title="Ranking — Tripulação (membros)" data={stats.crewMembers} />
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
  const height = Math.max(220, data.length * 28 + 40);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
