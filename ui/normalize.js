import { state } from './state.js';

export function normalizeSchema(data) {
  const tl = data.timeline || [];
  const firstT = tl[0];
  const firstPid = firstT ? Object.keys(firstT.participants || {})[0] : null;
  const firstPData = firstPid ? firstT.participants[firstPid] : null;

  if (firstPData && firstPData.dimensions && !firstPData.axes) {
    data.timeline = tl.map(t => {
      const newParticipants = {};
      for (const [pid, pdata] of Object.entries(t.participants || {})) {
        const dims = pdata.dimensions || {};
        const newAxes = {};
        for (const [d, vals] of Object.entries(dims)) {
          const A = vals.A || 0;
          const L = vals.L || 0;
          const M = vals.M || 0;
          const sigma = M > L ? (A < 20 ? 'Dst' : 'M') : 'L';
          newAxes[d] = { A, R: L, I: L, sigma };
        }
        const newPdata = { axes: newAxes };
        if (pdata.emission_external) {
          newPdata.payload_register = {
            retained: { note: '' },
            emitted: { note: pdata.emission_external.note || (pdata.emission_external.dominant_family || '') }
          };
        }
        if (pdata.taper_note) newPdata.pressure_note = pdata.taper_note;
        newParticipants[pid] = newPdata;
      }
      return {
        timestep_label: t.timestep_label,
        narrative_note: t.narrative_note || '',
        pressure_notes: t.emission_notes || '',
        participants: newParticipants
      };
    });

    if (data.matrix_events) {
      data.payload_events = data.matrix_events.map(me => ({
        timestep_idx: me.timestep_idx || 0,
        alpha_from: me.source_participant ? me.source_participant + '.' + (me.source || '?') : (me.source || '?'),
        alpha_to: me.target_participant ? me.target_participant + '.' + (me.target || '?') : (me.target || '?'),
        sigma: 'L',
        axis: me.target || me.source || 'Org',
        unfolding: me.direction === 'acute_down' ? 'acute' : 'accumulated',
        register: 'retained',
        mode: 'load',
        effect: me.effect || '',
        magnitude: me.magnitude || 5
      }));
      delete data.matrix_events;
    }

    if (data.analysis) {
      if (data.analysis.starting_dimension && !data.analysis.starting_axis) {
        data.analysis.starting_axis = data.analysis.starting_dimension;
        delete data.analysis.starting_dimension;
      }
      if (data.analysis.failure_mode && !data.analysis.failure_grammar) {
        data.analysis.failure_grammar = data.analysis.failure_mode;
        delete data.analysis.failure_mode;
      }
    }
  }

  if (data.schema_version === '2.0' || data.system) {
    return {
      case_id: data.system?.name || 'case',
      system_name: data.system?.name || 'Unnamed',
      locus_of_analysis: data.system?.locus || 'local',
      description: data.system?.summary || '',
      participants: (data.participants || []).map(p => ({
        id: p.id, name: p.name, address: 'α_(local)', description: p.role || ''
      })),
      timeline: (data.timeline || []).map((t, i) => ({
        timestep_label: t.label || ('T' + i),
        narrative_note: t.notes || '',
        participants: Object.fromEntries(
          Object.entries(t.states || {}).map(([pid, dims]) => {
            const axes = {};
            for (const [d, vals] of Object.entries(dims)) {
              axes[d] = {
                A: vals.A || 0,
                R: vals.L || vals.R || 0,
                I: vals.L || vals.I || 0,
                sigma: (vals.M || 0) > (vals.L || 0) ? 'M' : 'L'
              };
            }
            return [pid, { axes }];
          })
        )
      })),
      payload_events: [],
      analysis: data.analysis || null
    };
  }

  if (Array.isArray(data.payload_events) && data.payload_events.length) {
    const flattened = [];

    for (const ev of data.payload_events) {
      if (!ev || typeof ev !== 'object') continue;

      const bundle = Array.isArray(ev.payload_bundle) ? ev.payload_bundle : null;

      const normalizeAlphaFields = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;

        const aSrc = obj.alpha_source ?? obj.alpha_from;
        const aMed = obj.alpha_medium ?? obj.medium;
        const aRcv = obj.alpha_receiving ?? obj.alpha_to;

        if (obj.alpha_source == null && aSrc != null) obj.alpha_source = aSrc;
        if (obj.alpha_medium == null && aMed != null) obj.alpha_medium = aMed;
        if (obj.alpha_receiving == null && aRcv != null) obj.alpha_receiving = aRcv;

        if (obj.alpha_from == null && aSrc != null) obj.alpha_from = aSrc;
        if (obj.alpha_to == null && aRcv != null) obj.alpha_to = aRcv;
        if (obj.medium == null && aMed != null) obj.medium = aMed;

        if (obj.bearing == null && obj.payload_bearing != null) obj.bearing = obj.payload_bearing;
        if (obj.payload_bearing == null && obj.bearing != null) obj.payload_bearing = obj.bearing;
        if (typeof obj.mode === 'string') obj.mode = obj.mode.replaceAll('_','-');
        if (typeof obj.mu === 'string') obj.mu = obj.mu.replaceAll('_','-');

        return obj;
      };

      if (bundle && bundle.length) {
        for (const atom of bundle) {
          const merged = normalizeAlphaFields({
            ...ev,
            ...atom,
            unfolding: atom?.unfolding ?? ev.unfolding,
            register: atom?.register ?? ev.register,
            sigma: atom?.sigma ?? ev.sigma,
            d: atom?.d ?? atom?.axis ?? ev.d ?? ev.axis,
            axis: atom?.axis ?? atom?.d ?? ev.axis ?? ev.d,
          });
          delete merged.payload_bundle;
          flattened.push(merged);
        }
      } else {
        flattened.push(normalizeAlphaFields(ev));
      }
    }

    data.payload_events = flattened;
  }

  return data;
}

export function detectType(data) {
  if (state.sessions.length === 0) return 'new';
  const cur = state.sessions[state.currentIdx];
  if (!cur) return 'new';
  const curName = cur.system_name;
  const newName = data.system_name || data.case_id;
  if (!curName || !newName || curName !== newName) return 'parallel';
  const curLabels = new Set((cur.timeline || []).map(t => t.timestep_label));
  const newLabels = (data.timeline || []).map(t => t.timestep_label);
  const overlap = newLabels.filter(l => curLabels.has(l)).length;
  return overlap > 0 ? 'expansion' : 'continuation';
}

export function mergeSession(data, type) {
  const s = state.sessions[state.currentIdx];
  if (!s) return;

  if (type === 'continuation') {
    (data.timeline || []).forEach((t, i) => {
      t._boundary = (i === 0);
      s.timeline.push(t);
    });
    (data.participants || []).forEach(p => {
      if (!s.participants.find(x => x.id === p.id)) s.participants.push(p);
    });
    s.payload_events = (s.payload_events || []).concat(data.payload_events || []);
    if (data.analysis) s.analysis = data.analysis;
    state.currentT = s.timeline.length - 1;
  } else {
    (data.participants || []).forEach(p => {
      if (!s.participants.find(x => x.id === p.id)) s.participants.push(p);
    });
    s.payload_events = (s.payload_events || []).concat(data.payload_events || []);
  }
}
