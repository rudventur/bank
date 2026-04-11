/* --- Instalments Studio Styles --- */
.instalment-studio {
    background: var(--panel);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 30px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.studio-header h2 { margin-top: 0; }

.studio-controls {
    display: flex;
    gap: 15px;
    flex-wrap: wrap;
    padding: 15px;
    background: rgba(0,0,0,0.03);
    border-radius: 8px;
    align-items: flex-end;
}

.control-group { display: flex; flex-direction: column; gap: 5px; }
.control-group label { font-size: 0.8rem; font-weight: bold; color: var(--muted); }
.control-group select, .control-group input { 
    padding: 8px; 
    border: 1px solid var(--border); 
    border-radius: 6px; 
    background: #fff;
}

/* Excel Grid */
.grid-container {
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
    background: #fff;
}

.grid-header, .grid-row, .grid-footer {
    display: flex;
    align-items: center;
    border-bottom: 1px solid var(--border);
}

.grid-header {
    background: #f1f3f5;
    font-weight: bold;
    font-size: 0.85rem;
    color: #495057;
    padding: 8px 0;
}

.grid-row:last-child { border-bottom: none; }
.grid-row:hover { background: #f8f9fa; }

.grid-footer {
    background: #f8f9fa;
    padding: 10px 0;
    border-top: 2px solid var(--border);
}

.input-calc, .input-date {
    width: 100%;
    border: 1px solid transparent;
    background: transparent;
    font-family: inherit;
    font-size: 0.95rem;
    padding: 4px;
    border-radius: 4px;
}
.input-calc:focus, .input-date:focus {
    background: #fff;
    border-color: var(--primary);
    outline: none;
}
.input-calc { text-align: right; font-family: 'Courier New', monospace; font-weight:bold; }

/* Mini Calendar */
.calendar-sidebar {
    background: #fff;
    padding: 15px;
    border-radius: 8px;
    border: 1px solid var(--border);
    height: fit-content;
}

.mini-calendar { margin-bottom: 15px; }
.cal-header { 
    font-size: 0.85rem; 
    font-weight: bold; 
    margin-bottom: 5px; 
    text-align: center;
}
.cal-days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
}
.cal-day {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    border-radius: 4px;
    color: var(--muted);
}
.cal-day.has-payment {
    background: var(--primary);
    color: #fff;
    font-weight: bold;
}

/* Existing Plan Cards */
.plan-card {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 15px;
    transition: transform 0.2s;
}
.plan-card:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.05); }

.instalment-row {
    display: flex;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px dashed var(--border);
}
.instalment-row:last-child { border-bottom: none; }
.instalment-row.paid { opacity: 0.6; text-decoration: line-through; }
.instalment-row.overdue-row { background: rgba(255, 71, 87, 0.05); padding: 8px; border-radius: 4px; border:1px solid rgba(255,71,87,0.2); }

.progress-bar-bg { background: #e9ecef; height: 6px; border-radius: 3px; overflow: hidden; }
.progress-bar-fill { background: var(--primary); height: 100%; transition: width 0.3s ease; }
