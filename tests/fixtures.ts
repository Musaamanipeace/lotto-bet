// TEST-ONLY synthetic payloads shaped per the documented API fields. Never imported by app code.
export const sportyBody = {
  bizCode: 10000,
  data: { tournaments: [{ name: 'Premier League', events: [{
    eventId: 'sr:match:1', homeTeamName: 'Arsenal FC', awayTeamName: 'Chelsea FC', estimateStartTime: 1_800_000_000_000,
    markets: [
      { id: '1', specifier: '', outcomes: [
        { id: '1', desc: 'Home', odds: '2.10', isActive: 1 }, { id: '2', desc: 'Draw', odds: '3.40', isActive: 1 }, { id: '3', desc: 'Away', odds: '3.60', isActive: 1 } ] },
      { id: '18', specifier: 'total=2.5', outcomes: [
        { id: '12', desc: 'Over', odds: '1.85', isActive: 1 }, { id: '13', desc: 'Under', odds: '1.95', isActive: 1 } ] },
      { id: '9999', specifier: '', outcomes: [ { id: '1', desc: 'X', odds: '1.5', isActive: 1 }, { id: '2', desc: 'Y', odds: '2.5', isActive: 1 } ] },
    ],
  }] }] },
};

export const betpawaBody = {
  responses: [{ responses: [{
    id: 555, startTime: '2027-01-15T15:00:00Z',
    participants: [{ position: 1, name: 'Arsenal' }, { position: 2, name: 'Chelsea' }],
    competition: { name: 'Premier League' },
    markets: [
      { marketType: { id: 3743 }, row: [{ prices: [ { id: 1001, name: '1', odds: 2.2 }, { id: 1002, name: 'X', odds: 3.3 }, { id: 1003, name: '2', odds: 3.5 } ] }] },
      { marketType: { id: 4242 }, row: [{ prices: [ { id: 2001, name: 'A', odds: 1.5 }, { id: 2002, name: 'B', odds: 2.5 } ] }] },
    ],
  }] }],
};

export const jsonResponse = (status: number, body: unknown) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
