import { useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { FilterSidebar } from '@/components/FilterSidebar';
import { ThreatMap } from '@/components/ThreatMap';
import { ThreatFeed } from '@/components/ThreadFeed';
import { EventDetailPanel } from '@/components/EventDetailPanel';
import { LinkAnalysisGraph } from '@/components/LinkAnalysisGraph';
import { useThreatFeed } from '@/hooks/useThreatFeed';
import type { Filters, ThreatEvent } from '@/lib/types';
import { CITIES } from '@/lib/mockData';

const DEFAULT_FILTERS: Filters = {
  city: 'all',
  minRiskScore: 0,
  category: 'all',
};

export function Dashboard() {
  const { events, liveCount, isLive, setIsLive, simulateFraudEvent } = useThreatFeed();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [linkAnalysisOpen, setLinkAnalysisOpen] = useState(false);

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (filters.city !== 'all' && e.city !== filters.city) return false;
      if (e.riskScore < filters.minRiskScore) return false;
      if (filters.category !== 'all' && e.category !== filters.category) return false;
      return true;
    });
  }, [events, filters]);

  const highRiskEvents = useMemo(
    () => filteredEvents.filter((e) => e.riskScore > 0.85),
    [filteredEvents]
  );

  const criticalCount = useMemo(
    () => events.filter((e) => e.riskScore >= 0.9).length,
    [events]
  );

  const cityList = useMemo(
    () => CITIES.map((c) => c.name).sort(),
    []
  );

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedId) ?? null,
    [events, selectedId]
  );

  const handleSelect = (event: ThreatEvent) => {
    setSelectedId(event.id);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-slate-950 text-slate-100">
      <Header
        totalEvents={events.length}
        criticalCount={criticalCount}
        liveCount={liveCount}
        isLive={isLive}
        onSimulate={simulateFraudEvent}
      />

      <div className="flex flex-1 overflow-hidden">
        <FilterSidebar
          filters={filters}
          onChange={setFilters}
          cities={cityList}
          resultCount={filteredEvents.length}
          onReset={handleReset}
        />

        <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <ThreatMap
            events={filteredEvents}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
          <EventDetailPanel
            event={selectedEvent}
            onClose={() => setSelectedId(undefined)}
            onShowLinkAnalysis={() => setLinkAnalysisOpen(true)}
          />
        </div>

        <ThreatFeed
          events={highRiskEvents}
          selectedId={selectedId}
          onSelect={handleSelect}
          isLive={isLive}
          onToggleLive={() => setIsLive(!isLive)}
        />
      </div>

      <LinkAnalysisGraph
        event={selectedEvent}
        open={linkAnalysisOpen}
        onClose={() => setLinkAnalysisOpen(false)}
      />
    </div>
  );
}
