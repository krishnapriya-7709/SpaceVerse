import React, { useEffect, useState } from 'react';
import { CAMPAIGN_LEVELS, CampaignLevel, PlayerState, WELCOME_MESSAGES } from '../data/spaceverseData';
import { storyTransitions } from '../data/storyTransitions';
import { SFX } from '../utils/sfx';
import { RecruitBadgeSVG, SatelliteBuilderBadgeSVG, SatelliteIllustrationSVG } from './BadgesSVG';
import { SpaceCampaignMap } from './SpaceCampaignMap';

/* ========================================================
   1. SPACEVERSE INTRO SPLASH (2.6s)
   ======================================================== */
export const IntroSplash: React.FC<{ visible: boolean }> = ({ visible }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[1000] bg-[#020612] flex flex-col items-center justify-center p-6">
      <div className="text-[11px] font-mono-tech uppercase tracking-[4px] text-[#4fe3d4]/80 mb-3">
        GALAXY-X AEROSPACE COMPLEX // INITIALIZING
      </div>
      <h1 className="font-display text-4xl sm:text-6xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-[#4fe3d4] via-[#e8eefc] to-[#38bdf8] drop-shadow-[0_0_28px_rgba(79,227,212,0.55)] text-center">
        SPACEVERSE
      </h1>
      <p className="text-xs sm:text-sm text-slate-400 tracking-widest uppercase mt-2">
        Space Research &amp; Mission Engineering Facility
      </p>
      <div className="w-64 sm:w-80 h-1.5 rounded-full bg-slate-900 border border-cyan-400/30 mt-7 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#4fe3d4] to-[#38bdf8] animate-[introLoad_2.5s_ease-out_forwards]" />
      </div>
    </div>
  );
};

/* ========================================================
   2. 4-STEP TYPEWRITER WELCOME OVERLAY
   ======================================================== */
interface WelcomeOverlayProps {
  visible: boolean;
  onAccept: () => void;
}

export const WelcomeOverlay: React.FC<WelcomeOverlayProps> = ({ visible, onAccept }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [mainTyped, setMainTyped] = useState('');
  const [subTyped, setSubTyped] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [introChoiceIdx, setIntroChoiceIdx] = useState<number | null>(null);

  const currentMsg = WELCOME_MESSAGES[stepIdx];

  useEffect(() => {
    if (!visible) return;
    setMainTyped('');
    setSubTyped('');
    setIsTyping(true);

    let mainPos = 0;
    let subPos = 0;
    let t1: number | undefined;
    let t2: number | undefined;

    const tickMain = () => {
      if (mainPos < currentMsg.main.length) {
        mainPos += 1;
        setMainTyped(currentMsg.main.slice(0, mainPos));
        t1 = window.setTimeout(tickMain, 22);
      } else {
        tickSub();
      }
    };

    const tickSub = () => {
      if (subPos < currentMsg.sub.length) {
        subPos += 1;
        setSubTyped(currentMsg.sub.slice(0, subPos));
        t2 = window.setTimeout(tickSub, 13);
      } else {
        setIsTyping(false);
      }
    };

    t1 = window.setTimeout(tickMain, 80);
    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, [visible, stepIdx, currentMsg]);

  if (!visible) return null;

  const isFinal = stepIdx === WELCOME_MESSAGES.length - 1;
  const introStory = storyTransitions[0];

  const handleAction = () => {
    SFX.click();
    if (isTyping) {
      setMainTyped(currentMsg.main);
      setSubTyped(currentMsg.sub);
      setIsTyping(false);
      return;
    }
    if (!isFinal) {
      setStepIdx((prev) => prev + 1);
    } else {
      onAccept();
    }
  };

  return (
    <div className="fixed inset-0 z-[900] bg-gradient-to-b from-[#030816]/75 via-[#030816]/55 to-[#030816]/85 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#071329]/95 border border-cyan-400/40 p-7 md:p-8 shadow-[0_24px_70px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-between gap-4 mb-5">
          <span className="text-[11px] font-mono-tech font-bold tracking-widest text-[#4fe3d4]">
            {currentMsg.tag}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {WELCOME_MESSAGES.map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i <= stepIdx ? 'w-6 bg-[#4fe3d4]' : 'w-2 bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        <h2 className="font-display text-xl md:text-2xl font-extrabold text-white min-h-[36px] leading-snug">
          {mainTyped}
          {mainTyped.length < currentMsg.main.length && (
            <span className="text-[#4fe3d4] animate-[blinkCaret_0.8s_infinite]">▌</span>
          )}
        </h2>

        <p className="text-sm text-slate-300 mt-3 min-h-[54px] leading-relaxed">
          {subTyped}
          {(mainTyped.length === currentMsg.main.length || !isTyping) && (
            <span className="text-[#4fe3d4] animate-[blinkCaret_0.8s_infinite]">▌</span>
          )}
        </p>

        {isFinal && introStory && (
          <div className="mt-4 p-3 rounded-xl bg-[#091834] border border-cyan-400/30 space-y-2">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-bold text-amber-300">🎙️ {introStory.speaker}</span>
              <span className="font-mono-tech text-[#4fe3d4] uppercase">{introStory.uiTrigger}</span>
            </div>
            <p className="text-xs text-slate-200 leading-snug">&ldquo;{introStory.transmissionText}&rdquo;</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {introStory.choices.map((ch, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    SFX.select();
                    setIntroChoiceIdx(idx);
                  }}
                  className={`p-2 rounded-lg border text-left text-[11px] font-bold transition cursor-pointer ${
                    introChoiceIdx === idx
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                      : 'bg-[#061124] border-white/15 hover:border-cyan-400/60 text-slate-200'
                  }`}
                >
                  {introChoiceIdx === idx ? '✓ ' : '▸ '}
                  {ch.label}
                </button>
              ))}
            </div>
            {introChoiceIdx !== null && (
              <div className="px-2.5 py-1.5 rounded bg-emerald-500/15 border border-emerald-400/40 text-[11px] text-emerald-200 font-semibold">
                {introStory.choices[introChoiceIdx].effectText}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            {isTyping ? 'Click button to fast-forward transmission' : `Transmission ${stepIdx + 1} of 4`}
          </span>
          <button
            onClick={handleAction}
            className={`px-6 py-3 rounded-xl font-extrabold text-xs md:text-sm tracking-wide transition cursor-pointer shadow-lg ${
              isFinal
                ? 'bg-gradient-to-r from-[#f2c14e] to-[#f59e0b] text-[#051022] hover:brightness-110'
                : 'bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] hover:brightness-110'
            }`}
          >
            {isFinal ? 'ACCEPT INVITATION ★' : 'CONTINUE ❯'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ========================================================
   3. RECRUITMENT BADGE AWARD MODAL (Preserves 500 SC + New Recruit Badge)
   ======================================================== */
export const RecruitBadgeModal: React.FC<{ visible: boolean; onClaim: () => void }> = ({
  visible,
  onClaim,
}) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[2100] bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#07142b] border border-cyan-400/45 p-7 text-center shadow-[0_24px_64px_rgba(0,0,0,0.85)] animate-[popIn_0.35s_ease-out]">
        <div className="text-[11px] font-mono-tech font-bold uppercase tracking-[2px] text-[#4fe3d4]">
          CREDENTIAL ISSUED
        </div>
        <h2 className="font-display text-xl font-extrabold text-amber-300 mt-1">
          GALAXY-X NEW RECRUIT BADGE
        </h2>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          Commission approved! Starting research grants and Star Credits have been credited to your account.
        </p>

        <div className="my-5 flex justify-center">
          <RecruitBadgeSVG size={164} />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5 text-xs">
          <div className="p-3 rounded-xl bg-[#0b1b38] border border-cyan-400/30">
            <div className="text-slate-400 text-[10px] uppercase">Grant Credits</div>
            <div className="font-mono-tech text-base font-extrabold text-[#4fe3d4] mt-0.5 tabular-nums">
              ₡ 10,000
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0b1b38] border border-amber-400/30">
            <div className="text-slate-400 text-[10px] uppercase">Star Credits</div>
            <div className="font-mono-tech text-base font-extrabold text-amber-300 mt-0.5 tabular-nums">
              ★ 500 SC
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            SFX.click();
            onClaim();
          }}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs md:text-sm tracking-wide uppercase hover:brightness-110 transition cursor-pointer"
        >
          Proceed to Cadet Orientation ❯
        </button>
      </div>
    </div>
  );
};

/* ========================================================
   4. CADET TRAINING INTRO & COMPLETE MODALS
   ======================================================== */
export const TrainingIntroModal: React.FC<{
  visible: boolean;
  onBegin: () => void;
  onSkip: () => void;
}> = ({ visible, onBegin, onSkip }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[2100] bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#07142b] border border-cyan-400/45 p-6 md:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.85)]">
        <div className="text-[11px] font-mono-tech font-bold uppercase tracking-[2px] text-[#4fe3d4]">
          FLIGHT ACADEMY BRIEFING
        </div>
        <h2 className="font-display text-xl md:text-2xl font-extrabold text-white mt-1">
          CADET PRACTICE INITIATED
        </h2>
        <p className="text-xs md:text-sm text-slate-300 mt-2 leading-relaxed">
          Master 6 hands-on engineering stations across GALAXY-X using live hardware simulations before commanding missions.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2.5 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-[#0b1b38] border border-cyan-400/25">
            <div className="text-xl">🗺️</div>
            <div className="font-bold text-white mt-1">WASD / Map</div>
            <div className="text-[10px] text-slate-400">Move &amp; fast-travel</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0b1b38] border border-cyan-400/25">
            <div className="text-xl">🛰️</div>
            <div className="font-bold text-white mt-1">Click / Key E</div>
            <div className="text-[10px] text-slate-400">Inspect hardware</div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#0b1b38] border border-cyan-400/25">
            <div className="text-xl">⚡</div>
            <div className="font-bold text-white mt-1">6 Mini-Labs</div>
            <div className="text-[10px] text-slate-400">Interactive tests</div>
          </div>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              SFX.click();
              onBegin();
            }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs md:text-sm tracking-wide uppercase hover:brightness-110 transition cursor-pointer"
          >
            BEGIN PRACTICE ▶
          </button>
          <button
            onClick={() => {
              SFX.click();
              onSkip();
            }}
            className="px-5 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs tracking-wide uppercase transition cursor-pointer"
          >
            SKIP TUTORIAL ❯
          </button>
        </div>
      </div>
    </div>
  );
};

export const TrainingCompleteModal: React.FC<{
  visible: boolean;
  onViewCampaign: () => void;
}> = ({ visible, onViewCampaign }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[2100] bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#07142b] border border-emerald-400/50 p-7 text-center shadow-[0_24px_64px_rgba(0,0,0,0.85)] animate-[popIn_0.35s_ease-out]">
        <div className="text-[11px] font-mono-tech font-bold uppercase tracking-[2px] text-emerald-400">
          6 / 6 SYSTEMS VERIFIED
        </div>
        <h2 className="font-display text-xl md:text-2xl font-extrabold text-white mt-1.5">
          CADET TRAINING COMPLETED!
        </h2>
        <p className="text-sm text-slate-300 mt-3 leading-relaxed">
          You&apos;ve explored the facility, mastered the hardware labs, and are ready for your first mission.
        </p>

        <div className="my-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-400/35 text-xs text-emerald-200 font-semibold">
          Unlocked Credential: Mission Architect Certification &amp; Training Academy Levels
        </div>

        <button
          onClick={() => {
            SFX.click();
            onViewCampaign();
          }}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#34d399] text-[#041022] font-extrabold text-xs md:text-sm tracking-wide uppercase hover:brightness-110 transition cursor-pointer"
        >
          OPEN TRAINING ACADEMY ▶
        </button>
      </div>
    </div>
  );
};

/* ========================================================
   5. INTERACTIVE PRACTICE MODALS (RE-EXPORTED)
   ======================================================== */
export { SubsystemExplorerModal, TutorialTaskModal } from './TrainingInteractiveModals';

/* ========================================================
   6. TRAINING ACADEMY / 10-LEVEL CAMPAIGN SELECTION SCREEN
   ======================================================== */
interface CampaignDirectoryModalProps {
  visible: boolean;
  playerState: PlayerState;
  activeLevelIdx: number;
  tutStep: number;
  onClose: () => void;
  onStartTraining: () => void;
  onSelectLevel: (idx: number) => void;
}

export const CampaignDirectoryModal: React.FC<CampaignDirectoryModalProps> = ({
  visible,
  playerState,
  activeLevelIdx,
  tutStep,
  onClose,
  onStartTraining,
  onSelectLevel,
}) => {
  if (!visible) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          SFX.click();
          onClose();
        }
      }}
      className="fixed inset-0 z-[2000] bg-black/82 flex items-center justify-center p-2 md:p-4"
    >
      <SpaceCampaignMap
        playerState={playerState}
        activeLevelIdx={activeLevelIdx}
        tutStep={tutStep}
        onClose={onClose}
        onStartTraining={onStartTraining}
        onSelectLevel={onSelectLevel}
      />
    </div>
  );
};

/* ========================================================
   6B. STATION MISSION BRIEFING MODAL (Press E at Station)
   ======================================================== */
export const MissionBriefingModal: React.FC<{
  level: CampaignLevel | null;
  onAccept: () => void;
  onClose: () => void;
}> = ({ level, onAccept, onClose }) => {
  const [selectedChoiceIdx, setSelectedChoiceIdx] = useState<number | null>(null);

  useEffect(() => {
    setSelectedChoiceIdx(null);
  }, [level?.lvl]);

  if (!level) return null;

  const story = storyTransitions.find((s) => s.id === `level_${level.lvl}`);
  const activeChoice = selectedChoiceIdx !== null && story ? story.choices[selectedChoiceIdx] : null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          SFX.click();
          onClose();
        }
      }}
      className="fixed inset-0 z-[2200] bg-black/82 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[#07142b] border border-cyan-400/50 p-6 md:p-7 shadow-[0_24px_64px_rgba(0,0,0,0.88)] animate-[popIn_0.25s_ease-out]">
        <div className="flex items-center justify-between gap-2">
          <span className="px-2.5 py-0.5 rounded bg-amber-400/15 border border-amber-400/40 text-amber-300 text-[10px] font-mono-tech font-bold uppercase tracking-wider">
            📍 {level.briefingStationName}
          </span>
          <button
            type="button"
            onClick={() => {
              SFX.click();
              onClose();
            }}
            className="text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="text-[11px] font-mono-tech font-bold uppercase tracking-[2px] text-[#4fe3d4] mt-3">
          STATION MISSION BRIEFING // LEVEL 0{level.lvl}
        </div>
        <h2 className="font-display text-xl md:text-2xl font-extrabold text-white mt-1 flex items-center gap-2.5">
          <span>{level.icon}</span>
          <span>{level.title}</span>
        </h2>

        {story && (
          <div className="mt-3 p-3.5 rounded-xl bg-[#091834] border border-cyan-400/35 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-extrabold text-amber-300">
                🎙️ {story.speaker}
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-400/15 border border-cyan-400/40 text-[10px] font-mono-tech font-bold text-[#4fe3d4] uppercase">
                {story.uiTrigger}
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-200 leading-relaxed">
              &ldquo;{story.transmissionText}&rdquo;
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {story.choices.map((ch, cIdx) => {
                const isChosen = selectedChoiceIdx === cIdx;
                return (
                  <button
                    key={cIdx}
                    type="button"
                    onClick={() => {
                      SFX.select();
                      setSelectedChoiceIdx(cIdx);
                    }}
                    className={`p-2.5 rounded-lg border text-left text-xs font-bold transition cursor-pointer ${
                      isChosen
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                        : 'bg-[#061124] border-white/15 hover:border-cyan-400/60 text-slate-200'
                    }`}
                  >
                    {isChosen ? '✓ ' : '▸ '}
                    {ch.label}
                  </button>
                );
              })}
            </div>
            {activeChoice && (
              <div className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-[11px] font-semibold text-emerald-200">
                {activeChoice.effectText}
              </div>
            )}
          </div>
        )}

        {level.isLab && (
          <div className="mt-3 p-3.5 rounded-xl bg-[#050e20] border border-cyan-400/30 flex items-center gap-4">
            <SatelliteIllustrationSVG className="w-28 h-20 shrink-0" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <div className="font-bold text-[#4fe3d4] mb-0.5">Hangar &amp; Launchpad Directive</div>
              Assemble all 9 satellite subsystems, construct your 10-part two-stage rocket, stage it vertically on Launch Complex 39X, seal your satellite inside the payload fairing, and launch the rocket into space.
            </div>
          </div>
        )}

        {!level.isLab && (
          <p className="text-sm text-slate-300 mt-2.5 leading-relaxed">{level.goal}</p>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-[#0b1b38] border border-cyan-400/25">
            <div className="text-slate-400 text-[10px] uppercase">{level.isLab ? 'Target Orbit' : 'Target Apogee'}</div>
            <div className="font-mono-tech font-extrabold text-white mt-0.5">
              {level.isLab ? level.orbit : `${level.t} km`}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0b1b38] border border-cyan-400/25">
            <div className="text-slate-400 text-[10px] uppercase">{level.isLab ? 'Mission Scope' : 'Budget Limit'}</div>
            <div className="font-mono-tech font-extrabold text-[#4fe3d4] mt-0.5">
              {level.isLab ? '5 Engineering Stages' : `${level.b}M Grant`}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0b1b38] border border-amber-400/25">
            <div className="text-slate-400 text-[10px] uppercase">Reward</div>
            <div className="font-bold text-amber-300 mt-0.5 truncate">
              {level.isLab ? '1,000 SC + Badge' : level.rewardText}
            </div>
          </div>
        </div>

        <div className="mt-4 p-3.5 rounded-xl bg-[#060f22] border border-white/10 text-xs text-slate-300 space-y-1.5">
          <div className="font-bold text-[#4fe3d4]">Mission Station Route:</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {level.stationRoute.map((step, idx) => (
              <React.Fragment key={idx}>
                <span className="px-2 py-0.5 rounded bg-[#0b1933] border border-cyan-400/25 text-[11px] font-semibold text-slate-200">
                  {idx + 1}. {step}
                </span>
                {idx < level.stationRoute.length - 1 && <span className="text-[#4fe3d4] font-bold">→</span>}
              </React.Fragment>
            ))}
          </div>
          {!level.isLab && (
            <div className="pt-1.5 text-[11px] text-slate-400">
              Required Sensors: <strong className="text-amber-300">{level.displayReq.join(', ')}</strong>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => {
              SFX.taskComplete();
              onAccept();
            }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs md:text-sm tracking-wide uppercase hover:brightness-110 transition cursor-pointer"
          >
            {level.isLab ? 'ENTER SATELLITE ASSEMBLY LAB ▶' : 'ACCEPT BRIEFING & BEGIN STAGING ▶'}
          </button>
          <button
            type="button"
            onClick={() => {
              SFX.click();
              onClose();
            }}
            className="px-5 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase transition cursor-pointer"
          >
            Stay in Facility
          </button>
        </div>
      </div>
    </div>
  );
};

/* ========================================================
   7. LEVEL 2 INTRODUCTION SCREEN (Unlocked from Level 1 Next Button)
   ======================================================== */
export const Level2IntroModal: React.FC<{
  visible: boolean;
  onStartLevel2: () => void;
  onBackToAcademy: () => void;
}> = ({ visible, onStartLevel2, onBackToAcademy }) => {
  const lvl2 = CAMPAIGN_LEVELS[1];
  if (!visible || !lvl2) return null;

  return (
    <div className="fixed inset-0 z-[2200] bg-black/82 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#07142b] border border-cyan-400/50 p-7 shadow-[0_24px_64px_rgba(0,0,0,0.88)] animate-[popIn_0.3s_ease-out]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono-tech font-bold uppercase tracking-[2px] text-[#4fe3d4]">
            NEXT CAMPAIGN MISSION // UNLOCKED
          </span>
          <span className="px-2.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold">
            LEVEL 02 READY
          </span>
        </div>

        <h2 className="font-display text-xl md:text-2xl font-extrabold text-white mt-2 flex items-center gap-2.5">
          <span>{lvl2.icon}</span>
          <span>LEVEL 2: {lvl2.title.toUpperCase()}</span>
        </h2>

        <p className="text-sm text-slate-300 mt-2.5 leading-relaxed">{lvl2.goal}</p>

        <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#0b1b38] border border-cyan-400/25">
            <div className="text-slate-400 text-[10px] uppercase">Target Apogee</div>
            <div className="font-mono-tech font-extrabold text-white mt-0.5">{lvl2.t} km</div>
          </div>
          <div className="p-3 rounded-xl bg-[#0b1b38] border border-cyan-400/25">
            <div className="text-slate-400 text-[10px] uppercase">Budget Limit</div>
            <div className="font-mono-tech font-extrabold text-[#4fe3d4] mt-0.5">{lvl2.b}M Grant</div>
          </div>
          <div className="p-3 rounded-xl bg-[#0b1b38] border border-amber-400/25">
            <div className="text-slate-400 text-[10px] uppercase">Requisites</div>
            <div className="font-bold text-amber-300 mt-0.5 truncate">Temp + Camera</div>
          </div>
        </div>

        <div className="mt-4 p-3.5 rounded-xl bg-[#060f22] border border-white/10 text-xs text-slate-300 space-y-1">
          <div className="font-bold text-[#4fe3d4] mb-1">Flight Sequence Overview:</div>
          <div>1. Report to Mission Control Center (MCC) for launch contract clearance.</div>
          <div>2. Acquire Thermometer &amp; Multispectral Camera in Research Lab (SRL).</div>
          <div>3. Select a propulsion motor in Hangar (SAH), load the launch pad, and ignite launch from LCC!</div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              SFX.click();
              onStartLevel2();
            }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#4fe3d4] to-[#0ea5e9] text-[#041022] font-extrabold text-xs md:text-sm tracking-wide uppercase hover:brightness-110 transition cursor-pointer"
          >
            DEPLOY TO LEVEL 2 ▶
          </button>
          <button
            onClick={() => {
              SFX.click();
              onBackToAcademy();
            }}
            className="px-5 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase transition cursor-pointer"
          >
            Back to Academy
          </button>
        </div>
      </div>
    </div>
  );
};

/* ========================================================
   8. EXPLORER DOSSIER / ACCOUNT & BADGES MODAL
   ======================================================== */
export const ExplorerDossierModal: React.FC<{
  visible: boolean;
  playerState: PlayerState;
  onClose: () => void;
  onSwitchAccount: (callsign: string) => Promise<void>;
}> = ({ visible, playerState, onClose, onSwitchAccount }) => {
  const [callsignInput, setCallsignInput] = useState(playerState.callsign || 'Explorer-01');
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    setCallsignInput(playerState.callsign || 'Explorer-01');
  }, [playerState.callsign, visible]);

  if (!visible) return null;

  const satCertified =
    playerState.badges.includes('SATELLITE_BUILDER') || playerState.completedLevels.includes(1);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          SFX.click();
          onClose();
        }
      }}
      className="fixed inset-0 z-[2000] bg-black/80 flex items-center justify-center p-4"
    >
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#071124] border border-cyan-400/35 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.85)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <RecruitBadgeSVG size={64} />
            <div>
              <div className="text-[10px] font-mono-tech uppercase tracking-widest text-[#4fe3d4]">
                GALAXY-X PERSONNEL FILE // {playerState.callsign}
              </div>
              <h2 className="font-display text-lg font-extrabold text-white">EXPLORER DOSSIER</h2>
              <p className="text-xs text-slate-400">
                Completed Levels: {playerState.completedLevels.length} / 10
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              SFX.click();
              onClose();
            }}
            className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 cursor-pointer"
          >
            Close ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3.5 rounded-xl bg-[#0b1830] border border-cyan-400/25">
            <div className="text-[10px] uppercase text-slate-400">Grant Credits</div>
            <div className="font-mono-tech text-lg font-extrabold text-[#4fe3d4] tabular-nums">
              ₡ {playerState.grantCredits.toLocaleString()}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#0b1830] border border-amber-400/25">
            <div className="text-[10px] uppercase text-slate-400">Star Credits</div>
            <div className="font-mono-tech text-lg font-extrabold text-amber-300 tabular-nums">
              ★ {playerState.starCredits.toLocaleString()} SC
            </div>
          </div>
        </div>

        <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5">
          Earned Badges &amp; Certifications
        </div>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3 rounded-xl bg-[#0b1830] border border-cyan-400/35 text-center flex flex-col items-center">
            <RecruitBadgeSVG size={60} />
            <div className="text-[11px] font-bold text-white mt-2">GALAXY-X RECRUIT</div>
            <div className="text-[10px] font-bold text-[#4fe3d4] mt-0.5">● CERTIFIED</div>
          </div>

          <div
            className={`p-3 rounded-xl bg-[#0b1830] border border-white/10 text-center flex flex-col items-center ${
              playerState.trainingCompleted ? '' : 'opacity-45 grayscale'
            }`}
          >
            <RecruitBadgeSVG size={60} />
            <div className="text-[11px] font-bold text-white mt-2">MISSION ARCHITECT</div>
            <div
              className={`text-[10px] font-bold mt-0.5 ${
                playerState.trainingCompleted ? 'text-amber-300' : 'text-slate-500'
              }`}
            >
              {playerState.trainingCompleted ? '● UNLOCKED' : 'LOCKED'}
            </div>
          </div>

          <div
            className={`p-3 rounded-xl bg-[#0b1830] border border-white/10 text-center flex flex-col items-center ${
              satCertified ? '' : 'opacity-45 grayscale'
            }`}
          >
            <SatelliteBuilderBadgeSVG size={60} />
            <div className="text-[11px] font-bold text-white mt-2">SATELLITE BUILDER</div>
            <div
              className={`text-[10px] font-bold mt-0.5 ${
                satCertified ? 'text-[#4fe3d4]' : 'text-slate-500'
              }`}
            >
              {satCertified ? '● CERTIFIED' : 'LOCKED'}
            </div>
          </div>
        </div>

        {/* Account Session / Persistence Switcher */}
        <div className="p-3.5 rounded-xl bg-[#060d1c] border border-white/10">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
            Explorer Account Session (Database Persisted)
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={callsignInput}
              onChange={(e) => setCallsignInput(e.target.value)}
              placeholder="Enter Explorer Callsign"
              className="flex-1 px-3 py-2 rounded-lg bg-[#0b172e] border border-cyan-400/30 text-xs text-white focus:outline-none focus:border-[#4fe3d4]"
            />
            <button
              disabled={switching}
              onClick={async () => {
                SFX.click();
                setSwitching(true);
                try {
                  await onSwitchAccount(callsignInput.trim() || 'Explorer-01');
                } finally {
                  setSwitching(false);
                }
              }}
              className="px-4 py-2 rounded-lg bg-cyan-400/15 hover:bg-cyan-400/30 border border-cyan-400/45 text-[#4fe3d4] text-xs font-bold cursor-pointer"
            >
              {switching ? 'Syncing...' : 'Switch / Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
