"use client";

import {
  ArrowDownRight,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Coins,
  Compass,
  Flame,
  Leaf,
  Plus,
  ScrollText,
  Shield,
  Sparkles,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import styles from "./planner.module.css";

type QuestStatus = "open" | "ready" | "claimed";
type Category = "Wellness" | "Learning" | "Craft" | "Adventure" | "Focus";
type Quest = {
  id: string;
  title: string;
  description: string;
  category: Category;
  time: string;
  xp: number;
  status: QuestStatus;
};
type PlannerData = {
  quests: Record<string, Quest[]>;
  xp: number;
  coins: number;
  bestStreak: number;
  activityDays: string[];
};

const STORAGE_KEY = "quest-day-planner-v1";
const CATEGORIES: Category[] = ["Wellness", "Learning", "Craft", "Adventure", "Focus"];
const CATEGORY_ICONS: Record<Category, string> = {
  Wellness: "✧",
  Learning: "⌘",
  Craft: "✿",
  Adventure: "⚔",
  Focus: "◈",
};
const SEED_DAY_COUNT = 8;

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromKey(value: string) {
  return new Date(`${value}T12:00:00`);
}

function shiftDay(value: string, offset: number) {
  const date = dateFromKey(value);
  date.setDate(date.getDate() + offset);
  return dayKey(date);
}

function dayDistance(from: string, to: string) {
  return Math.round((dateFromKey(to).getTime() - dateFromKey(from).getTime()) / 86_400_000);
}

function prettyDate(value: string, options: Intl.DateTimeFormatOptions) {
  return dateFromKey(value).toLocaleDateString("en-US", options);
}

function makeSeedData(today: string): PlannerData {
  const activityDays = Array.from({ length: SEED_DAY_COUNT }, (_, index) => shiftDay(today, index - SEED_DAY_COUNT));
  return {
    xp: 760,
    coins: 285,
    bestStreak: 17,
    activityDays,
    quests: {
      [today]: [
        {
          id: "seed-forest-walk",
          title: "Take a mindful forest walk",
          description: "Step outside, breathe deep, and notice something new.",
          category: "Wellness",
          time: "09:00",
          xp: 45,
          status: "ready",
        },
        {
          id: "seed-study",
          title: "Read a chapter of a good book",
          description: "A little knowledge goes a long way on the trail.",
          category: "Learning",
          time: "11:30",
          xp: 35,
          status: "open",
        },
        {
          id: "seed-water",
          title: "Drink eight glasses of water",
          description: "Keep your energy up for the adventures ahead.",
          category: "Wellness",
          time: "14:00",
          xp: 25,
          status: "open",
        },
        {
          id: "seed-focus",
          title: "Finish one important task",
          description: "Choose your target. Give it your full attention.",
          category: "Focus",
          time: "16:30",
          xp: 55,
          status: "open",
        },
      ],
    },
  };
}

function levelFor(xp: number) {
  let level = 1;
  let remaining = xp;
  let nextXp = 180;
  while (remaining >= nextXp) {
    remaining -= nextXp;
    level += 1;
    nextXp = 180 + (level - 1) * 70;
  }
  return { level, progressXp: remaining, nextXp, percent: Math.min(100, (remaining / nextXp) * 100) };
}

function streakFor(activityDays: string[], today: string) {
  const days = new Set(activityDays);
  const latest = [...days].sort().at(-1);
  if (!latest) return 0;
  const idleDays = dayDistance(latest, today);
  if (idleDays > 1) return 0;
  let count = 0;
  let cursor = latest;
  while (days.has(cursor)) {
    count += 1;
    cursor = shiftDay(cursor, -1);
  }
  return count;
}

function seededWeek(activityDays: string[], today: string) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = shiftDay(today, index - 6);
    return { date, label: prettyDate(date, { weekday: "short" }).slice(0, 1), done: activityDays.includes(date), today: date === today };
  });
}

type QuestDraft = Omit<Quest, "id" | "status">;

const EMPTY_DRAFT: QuestDraft = {
  title: "",
  description: "",
  category: "Adventure",
  time: "09:00",
  xp: 30,
};

export function PlannerApp() {
  const [today, setToday] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [data, setData] = useState<PlannerData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QuestDraft>(EMPTY_DRAFT);
  const [confetti, setConfetti] = useState(0);
  const [celebration, setCelebration] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const localToday = dayKey(new Date());
    setToday(localToday);
    setSelectedDay(localToday);
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? (JSON.parse(saved) as PlannerData) : null;
      if (
        parsed &&
        parsed.quests &&
        Array.isArray(parsed.activityDays) &&
        Number.isFinite(parsed.xp) &&
        Number.isFinite(parsed.coins)
      ) {
        setData(parsed);
      } else {
        setData(makeSeedData(localToday));
      }
    } catch {
      setData(makeSeedData(localToday));
    }
  }, []);

  useEffect(() => {
    if (data) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const quests = useMemo(() => data?.quests[selectedDay] ?? [], [data, selectedDay]);
  const level = levelFor(data?.xp ?? 0);
  const claimedToday = data?.activityDays.includes(today) ?? false;
  const currentStreak = streakFor(data?.activityDays ?? [], today);
  const week = seededWeek(data?.activityDays ?? [], today);
  const doneCount = quests.filter((quest) => quest.status !== "open").length;
  const claimedCount = quests.filter((quest) => quest.status === "claimed").length;
  const completionPercent = quests.length ? Math.round((doneCount / quests.length) * 100) : 0;
  const todayDate = selectedDay ? prettyDate(selectedDay, { weekday: "long", month: "long", day: "numeric" }) : "Loading your quests…";

  function changeQuestStatus(id: string) {
    if (!data) return;
    setData((current) => {
      if (!current) return current;
      const currentQuests = current.quests[selectedDay] ?? [];
      const updated = currentQuests.map((quest) =>
        quest.id !== id || quest.status === "claimed"
          ? quest
          : { ...quest, status: quest.status === "open" ? "ready" as const : "open" as const },
      );
      return { ...current, quests: { ...current.quests, [selectedDay]: updated } };
    });
  }

  function claimReward(id: string) {
    if (!data || selectedDay > today) return;
    const quest = (data.quests[selectedDay] ?? []).find((item) => item.id === id);
    if (!quest || quest.status !== "ready") return;

    let xpPenalty = 0;
    const completedBefore = data.activityDays.filter((date) => date < selectedDay).sort().at(-1);
    if (completedBefore && dayDistance(completedBefore, selectedDay) > 1 && currentStreak === 0) {
      xpPenalty = Math.ceil(data.xp * 0.2);
    }
    const updatedQuests = (data.quests[selectedDay] ?? []).map((item) =>
      item.id === id ? { ...item, status: "claimed" as const } : item,
    );
    const activityDays = Array.from(new Set([...data.activityDays, selectedDay])).sort();
    const nextStreak = streakFor(activityDays, today);
    setData({
      ...data,
      xp: Math.max(0, data.xp - xpPenalty) + quest.xp,
      coins: data.coins + Math.max(5, Math.round(quest.xp * 0.4)),
      bestStreak: Math.max(data.bestStreak, nextStreak),
      activityDays,
      quests: { ...data.quests, [selectedDay]: updatedQuests },
    });
    setConfetti((value) => value + 1);
    setCelebration(quest.title);
    setToast(xpPenalty > 0 ? `Streak broken · ${xpPenalty} XP lost` : `Quest claimed · +${quest.xp} XP`);
    window.setTimeout(() => setCelebration(""), 3000);
  }

  function openCreate() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setModalOpen(true);
  }

  function openEdit(quest: Quest) {
    if (quest.status === "claimed") return;
    setEditingId(quest.id);
    setDraft({ title: quest.title, description: quest.description, category: quest.category, time: quest.time, xp: quest.xp });
    setModalOpen(true);
  }

  function saveQuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !draft.title.trim()) return;
    const currentQuests = data.quests[selectedDay] ?? [];
    const questsForDay = editingId
      ? currentQuests.map((quest) => quest.id === editingId ? { ...quest, ...draft, title: draft.title.trim() } : quest)
      : [...currentQuests, { ...draft, title: draft.title.trim(), id: crypto.randomUUID(), status: "open" as const }];
    setData({ ...data, quests: { ...data.quests, [selectedDay]: questsForDay.sort((a, b) => a.time.localeCompare(b.time)) } });
    setModalOpen(false);
    setToast(editingId ? "Quest updated" : "New quest added to your log");
  }

  function deleteQuest(id: string) {
    if (!data) return;
    setData({
      ...data,
      quests: { ...data.quests, [selectedDay]: (data.quests[selectedDay] ?? []).filter((quest) => quest.id !== id) },
    });
    setModalOpen(false);
    setToast("Quest removed from your log");
  }

  if (!data || !today) {
    return <main className={styles.loading}><Sparkles size={18} /> Preparing your next adventure…</main>;
  }

  const canClaim = selectedDay <= today;
  const sparkles = Array.from({ length: 38 }, (_, index) => ({
    left: `${((index * 47 + 13) % 96) + 2}%`,
    delay: `${(index % 7) * 0.05}s`,
    drift: `${((index * 59) % 360) - 180}px`,
    size: `${6 + (index % 5) * 2}px`,
    hue: (index * 37 + 19) % 360,
  }));

  return (
    <main className={styles.planner}>
      <aside className={styles.sidebar}>
        <a className={styles.brand} href="#quest-log" aria-label="Quest day home">
          <span className={styles.brandIcon}><Compass size={20} /></span>
          <span>quest<span className={styles.brandDot}>.</span>day</span>
        </a>
        <div className={styles.realmLabel}><span /> YOUR REALM</div>
        <nav className={styles.navigation} aria-label="Main navigation">
          <a className={`${styles.navLink} ${styles.navActive}`} href="#quest-log"><ScrollText size={18} /> My quests <span className={styles.navCount}>{quests.length}</span></a>
          <a className={styles.navLink} href="#rewards"><Coins size={18} /> Reward vault</a>
          <a className={styles.navLink} href="#journey"><Compass size={18} /> My journey</a>
          <a className={styles.navLink} href="#hall-of-fame"><Trophy size={18} /> Hall of fame</a>
        </nav>
        <div className={styles.sidebarQuest}>
          <div className={styles.sidebarQuestArt}><span>✦</span><Shield size={27} /></div>
          <p className={styles.sideEyebrow}>TODAY’S ADVENTURE</p>
          <strong>The Path of Small Wins</strong>
          <div className={styles.sideProgress}><span style={{ width: `${completionPercent}%` }} /></div>
          <p className={styles.sideProgressText}>{doneCount} of {quests.length} quests complete</p>
        </div>
        <div className={styles.sidebarBottom}><span className={styles.avatar}>A</span><span><strong>Adventurer</strong><small>Level {level.level} ranger</small></span><Sparkles size={15} /></div>
      </aside>

      <section className={styles.mainColumn}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}><span>MY REALM</span><ChevronRight size={14} /><strong>DAILY QUESTS</strong></div>
          <div className={styles.topbarRight}>
            <span className={styles.todayBadge}><span /> <strong>Your progress saves automatically</strong></span>
            <button className={styles.profileButton} aria-label="Adventurer profile"><span className={styles.avatar}>A</span><ChevronRight size={14} /></button>
          </div>
        </header>

        <div className={styles.content}>
          <section className={styles.welcome}>
            <div>
              <span className={styles.kicker}><Sparkles size={13} /> YOUR STORY CONTINUES</span>
              <h1>Make today <em>legendary.</em></h1>
              <p>Every little quest brings you closer to the hero you’re becoming.</p>
            </div>
            <div className={styles.levelCard}>
              <div className={styles.levelTop}><span className={styles.levelBadge}><Shield size={15} /> LVL {level.level}</span><span className={styles.levelTitle}>Forest Wanderer</span><span className={styles.levelEmblem}>✦</span></div>
              <div className={styles.xpMeta}><span><Zap size={13} /> EXPERIENCE</span><strong>{level.progressXp} <small>/ {level.nextXp} XP</small></strong></div>
              <div className={styles.xpTrack}><span style={{ width: `${level.percent}%` }} /></div>
              <p>{Math.max(0, level.nextXp - level.progressXp)} XP to level {level.level + 1}</p>
            </div>
          </section>

          <section className={styles.statGrid} aria-label="Your adventure stats">
            <article className={`${styles.statCard} ${styles.streakCard}`}>
              <div className={styles.statIcon}><Flame size={19} fill="currentColor" /></div>
              <div><span className={styles.statLabel}>CURRENT STREAK</span><div className={styles.statValue}>{currentStreak}<small> days</small><span className={styles.statSpark}>✦</span></div><span className={styles.statFoot}>{claimedToday ? "Your streak is burning bright" : "Claim a quest to keep it alive"}</span></div>
              <div className={styles.streakMark}>✺</div>
            </article>
            <article className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.recordIcon}`}><Trophy size={18} /></div>
              <div><span className={styles.statLabel}>PERSONAL BEST</span><div className={styles.statValue}>{data.bestStreak}<small> days</small></div><span className={styles.statFoot}>Your longest streak so far</span></div>
            </article>
            <article className={styles.statCard} id="rewards">
              <div className={`${styles.statIcon} ${styles.coinsIcon}`}><Coins size={19} /></div>
              <div><span className={styles.statLabel}>GOLD EARNED</span><div className={styles.statValue}>{data.coins.toLocaleString()}<small> gold</small></div><span className={styles.statFoot}>A little treasure, well earned</span></div>
            </article>
          </section>

          <section className={styles.questSection} id="quest-log">
            <div className={styles.sectionHeading}>
              <div>
                <div className={styles.sectionTitleLine}><span className={styles.titleMark}><ScrollText size={17} /></span><h2>{selectedDay === today ? "Today’s quest log" : "Quest log"}</h2></div>
                <p>{todayDate} <span className={styles.headingDot}>·</span> Make every moment count</p>
              </div>
              <button className={styles.addButton} onClick={openCreate}><Plus size={17} /> <span>New quest</span></button>
            </div>

            <div className={styles.dayStrip}>
              <div className={styles.dayNavigation}>
                <button aria-label="Previous day" onClick={() => setSelectedDay((day) => shiftDay(day, -1))}><ChevronLeft size={16} /></button>
                <button className={selectedDay === today ? styles.todaySelected : ""} onClick={() => setSelectedDay(today)}>Today</button>
                <button aria-label="Next day" disabled={selectedDay >= today} onClick={() => setSelectedDay((day) => shiftDay(day, 1))}><ChevronRight size={16} /></button>
              </div>
              <div className={styles.weekDays} aria-label="Last seven days activity">
                {week.map((day) => <span key={day.date} title={prettyDate(day.date, { weekday: "long", month: "long", day: "numeric" })} className={`${styles.weekDay} ${day.done ? styles.weekDone : ""} ${day.today ? styles.weekToday : ""}`}>{day.done ? <Check size={11} /> : day.label}</span>)}
              </div>
              <span className={styles.weekCaption}>{claimedCount} CLAIMED {selectedDay === today ? "TODAY" : "THIS DAY"}</span>
            </div>

            <div className={styles.progressSummary}><span><strong>{doneCount}</strong> of {quests.length} quests complete</span><span>{completionPercent}%</span></div>
            <div className={styles.questProgress}><span style={{ width: `${completionPercent}%` }} /></div>

            {quests.length === 0 ? (
              <div className={styles.emptyState}><span><Leaf size={21} /></span><strong>A fresh page awaits</strong><p>Add your first quest and start an adventure.</p><button className={styles.addButton} onClick={openCreate}><Plus size={16} /> Create a quest</button></div>
            ) : (
              <div className={styles.questList}>
                {quests.map((quest, index) => (
                  <article key={quest.id} className={`${styles.questCard} ${quest.status === "claimed" ? styles.questClaimed : quest.status === "ready" ? styles.questReady : ""}`}>
                    <button className={styles.questCheck} onClick={() => changeQuestStatus(quest.id)} aria-label={quest.status === "open" ? `Mark ${quest.title} complete` : quest.status === "ready" ? `Unmark ${quest.title} complete` : `${quest.title} reward claimed`} disabled={quest.status === "claimed"}>
                      {quest.status === "claimed" ? <Check size={15} /> : quest.status === "ready" ? <Check size={15} /> : <Circle size={22} strokeWidth={1.6} />}
                    </button>
                    <div className={styles.questOrder}>{String(index + 1).padStart(2, "0")}</div>
                    <button className={styles.questInfo} onClick={() => openEdit(quest)} disabled={quest.status === "claimed"}>
                      <span className={styles.questTitle}>{quest.title}</span>
                      <span className={styles.questDescription}>{quest.description || "A small step on your adventure."}</span>
                      <span className={styles.questMeta}><span className={styles.categoryPill}><span>{CATEGORY_ICONS[quest.category]}</span>{quest.category}</span><span className={styles.questTime}><Clock3 size={12} /> {quest.time}</span></span>
                    </button>
                    <div className={styles.questReward}>
                      <span className={styles.xpPill}><Zap size={12} fill="currentColor" /> {quest.xp} XP</span>
                      {quest.status === "ready" ? (
                        <button className={styles.claimButton} onClick={() => claimReward(quest.id)} disabled={!canClaim}><Sparkles size={14} /> Claim reward</button>
                      ) : quest.status === "claimed" ? (
                        <span className={styles.claimedLabel}><CheckCircle2 size={14} /> Claimed</span>
                      ) : (
                        <span className={styles.claimHint}>Complete to unlock</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            <button className={styles.addAnother} onClick={openCreate}><Plus size={15} /> Add another quest</button>
          </section>

          <section className={styles.streakNotice}>
            <span className={styles.noticeIcon}><Flame size={16} /></span>
            <p><strong>Protect your progress.</strong> Miss a day and the forest takes 20% of your banked XP when your next streak begins.</p>
            <ArrowRight size={16} />
          </section>
        </div>
      </section>

      <aside className={styles.rightColumn}>
        <div className={styles.rightHeader}><span>YOUR COMPANION</span><span className={styles.onlineDot} title="Always here to cheer you on" /></div>
        <section className={styles.mascotCard}>
          <div className={styles.mascotBackdrop}><span className={styles.mascotStar}>✦</span><span className={styles.mascotStar2}>✧</span><span className={styles.mascotLeaf}>❋</span></div>
          <img className={`${styles.mascot} ${celebration ? styles.mascotCelebrate : ""}`} src="/elf-ranger.svg" alt="A cheerful blonde elf ranger, your quest companion" />
          <span className={styles.mascotName}><span /> LUMI · ELF RANGER</span>
          <div className={styles.speechBubble}>
            <span className={styles.speechSpark}>✦</span>
            <p>{celebration ? <>Brilliant work!<br /><strong>“{celebration}”</strong> is in the books!</> : claimedToday ? <>You’re on a roll!<br /><strong>That’s how legends are made.</strong></> : <>One quest at a time.<br /><strong>You’ve got this, adventurer!</strong></>}</p>
            {celebration && <span className={styles.speechReward}><Zap size={13} /> +XP earned!</span>}
          </div>
        </section>

        <section className={styles.journeyCard} id="journey">
          <div className={styles.cardHeading}><span><Flame size={15} /> Your journey</span><button aria-label="View streak details" onClick={() => setToast(`Your best streak is ${data.bestStreak} days`)}><ArrowRight size={15} /></button></div>
          <div className={styles.journeyStats}><div><strong>{currentStreak}</strong><span>current days</span></div><span className={styles.journeyDivider} /><div><strong>{data.bestStreak}</strong><span>best ever</span></div></div>
          <div className={styles.streakCalendar}>{week.map((day) => <div key={day.date} className={styles.calendarDay}><span className={`${styles.calendarDot} ${day.done ? styles.calendarDone : ""} ${day.today ? styles.calendarToday : ""}`}>{day.done ? <Check size={11} /> : day.today ? <Flame size={11} /> : null}</span><small>{prettyDate(day.date, { weekday: "short" }).slice(0, 2)}</small></div>)}</div>
          <p className={styles.keepGoing}><span>✦</span> {claimedToday ? "Your flame is alive today!" : "Complete a quest to keep your flame alive."}</p>
        </section>

        <section className={styles.milestoneCard} id="hall-of-fame">
          <div className={styles.milestoneTop}><span className={styles.milestoneIcon}><Award size={17} /></span><span className={styles.milestoneTag}>NEXT MILESTONE</span><Sparkles size={14} /></div>
          <strong>Trailblazer</strong>
          <p>Reach a 10-day streak</p>
          <div className={styles.milestoneProgress}><span style={{ width: `${Math.min(100, (currentStreak / 10) * 100)}%` }} /></div>
          <div className={styles.milestoneFooter}><span>{Math.min(10, currentStreak)} / 10 days</span><span><Coins size={12} /> +100 gold</span></div>
        </section>

        <section className={styles.tipCard}><span><Leaf size={15} /></span><p><strong>Ranger’s wisdom</strong>Small, steady steps take you further than giant leaps.</p><Sparkles size={13} /></section>
        <footer className={styles.rightFooter}>MADE FOR THE QUEST WITHIN <span>✦</span></footer>
      </aside>

      {modalOpen && (
        <div className={styles.modalBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}>
          <form className={styles.questModal} onSubmit={saveQuest}>
            <button className={styles.modalClose} type="button" onClick={() => setModalOpen(false)} aria-label="Close"><X size={18} /></button>
            <span className={styles.modalIcon}><ScrollText size={18} /></span>
            <span className={styles.kicker}>WRITE YOUR OWN ADVENTURE</span>
            <h2>{editingId ? "Edit your quest" : "Add a new quest"}</h2>
            <p>Every great journey starts with one small step.</p>
            <label className={styles.fieldLabel}>QUEST NAME<input required maxLength={80} autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Stretch for ten minutes" /></label>
            <label className={styles.fieldLabel}>A LITTLE MORE DETAIL <textarea maxLength={160} rows={2} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What does completing this quest look like?" /></label>
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>QUEST TYPE<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as Category })}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label className={styles.fieldLabel}>TIME<input type="time" value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} /></label>
            </div>
            <label className={styles.fieldLabel}>REWARD <span className={styles.xpField}><Zap size={13} /> <input type="number" min={5} max={200} step={5} value={draft.xp} onChange={(event) => setDraft({ ...draft, xp: Math.max(5, Number(event.target.value)) })} /> XP</span></label>
            <div className={styles.modalActions}>
              {editingId && <button className={styles.deleteButton} type="button" onClick={() => deleteQuest(editingId)}><ArrowDownRight size={15} /> Remove</button>}
              <button className={styles.cancelButton} type="button" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className={styles.saveButton} type="submit"><Sparkles size={15} /> {editingId ? "Save quest" : "Add to quest log"}</button>
            </div>
          </form>
        </div>
      )}

      {confetti > 0 && <div key={confetti} className={styles.confettiLayer} aria-hidden="true">{sparkles.map((particle, index) => <span key={`${confetti}-${index}`} style={{ "--left": particle.left, "--delay": particle.delay, "--drift": particle.drift, "--size": particle.size, "--hue": particle.hue } as CSSProperties} />)}</div>}
      {toast && <div className={styles.toast}><Sparkles size={15} /> {toast}</div>}
    </main>
  );
}
