import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// --- Custom Pixel Font Style ---
const PIXEL_FONT = `
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
  .font-pixel {
    font-family: 'Press Start 2P', monospace;
    line-height: 1.5;
  }
  .scanlines {
    background: linear-gradient(
      to bottom,
      rgba(255,255,255,0),
      rgba(255,255,255,0) 50%,
      rgba(0,0,0,0.2) 50%,
      rgba(0,0,0,0.2)
    );
    background-size: 100% 4px;
    pointer-events: none;
  }
`;

// --- Historical Character Data ---
const CHARACTERS = {
  american: {
    id: 'american',
    title: 'White American from the East',
    journey: 'You packed a wagon and traveled for months across the Great Plains and the Rocky Mountains to reach California.',
    foodName: 'bacon and biscuits',
    workVerb: 'panned for gold in the freezing river',
    workNoun: 'Mining',
    tips: 'White Americans often had an easier time with laws in the new city, but mining was still back-breaking work.'
  },
  californio: {
    id: 'californio',
    title: 'Californio Resident',
    journey: 'Your family has lived in California since it was part of Mexico. You rode your horse from your family rancho to the booming city.',
    foodName: 'beef and corn tortillas',
    workVerb: 'sold rancho beef and traded goods',
    workNoun: 'Ranching & Trade',
    tips: 'Californios knew the land best and had large cattle herds, but many had to fight unfair laws to keep their land.'
  },
  latinAmerican: {
    id: 'latinAmerican',
    title: 'Latin American Miner',
    journey: 'You sailed on a ship all the way from Chile. You brought expert mining skills that many others did not have.',
    foodName: 'beans and dried meat',
    workVerb: 'used your wooden batea bowl to wash gravel for gold',
    workNoun: 'Expert Mining',
    tips: 'Miners from Chile and Mexico were experts at finding gold, but they were often forced to pay unfair taxes.'
  },
  chinese: {
    id: 'chinese',
    title: 'Chinese Immigrant',
    journey: 'You crossed the giant Pacific Ocean on a crowded ship from Guangdong, China. You call this place Gum Shan, the Gold Mountain.',
    foodName: 'rice and dried fish',
    workVerb: 'washed laundry and carefully mined old river claims',
    workNoun: 'Laundry & Mining',
    tips: 'Chinese immigrants faced intense unfair treatment, but they built a strong, supportive neighborhood called Chinatown.'
  },
  hawaiian: {
    id: 'hawaiian',
    title: 'Hawaiian Pacific Islander',
    journey: 'You are an expert sailor. You left the Hawaiian Islands and sailed across the ocean to California very early in the Gold Rush.',
    foodName: 'ship biscuits and fresh fish',
    workVerb: 'unloaded heavy cargo from ships at the docks',
    workNoun: 'Dock & River Work',
    tips: 'Pacific Islanders were vital for sailing ships and moving goods up the rivers to the gold fields.'
  },
  australian: {
    id: 'australian',
    title: 'Australian Migrant',
    journey: 'You heard the news of gold and boarded a ship in Sydney, Australia. You brought your tools across the sea.',
    foodName: 'tea and salt meat',
    workVerb: 'fixed broken wagons and built wooden sidewalks',
    workNoun: 'Carpentry',
    tips: 'Many Australians brought skilled trades like carpentry which were desperately needed to build the new city.'
  },
  africanAmerican: {
    id: 'africanAmerican',
    title: 'African American Entrepreneur',
    journey: 'You came to California seeking freedom and opportunity. You traveled a long way to build a brand new life.',
    foodName: 'cornbread and hot stew',
    workVerb: 'cut hair at your barbershop and cooked hot meals',
    workNoun: 'Business Owner',
    tips: 'African Americans built very successful businesses and churches, helping to create a strong community in the new city.'
  }
};

const HOUSING_LEVELS = [
  { name: 'Muddy Canvas Tent', costMoney: 0, costSupplies: 0 },
  { name: 'Sturdy Wooden Cabin', costMoney: 50, costSupplies: 20 },
  { name: 'Nice City House', costMoney: 200, costSupplies: 50 }
];

export default function App() {
  // --- Firebase State ---
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(null);
  const [appId, setAppId] = useState('gold-rush-game');
  const [saveStatus, setSaveStatus] = useState('');

  // --- Game State ---
  const [gameState, setGameState] = useState('title'); // title, select, wealth, intro, loop, end
  const [playerInfo, setPlayerInfo] = useState({
    characterId: null,
    wealthLevel: null,
    day: 1,
    maxDays: 30,
    money: 0,
    food: 0,
    supplies: 0,
    housingIndex: 0,
    logs: []
  });

  const bottomRef = useRef(null);

  // --- Scroll to Bottom ---
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [playerInfo.logs, gameState]);

  // --- Firebase Initialization ---
  useEffect(() => {
    try {
      if (typeof __firebase_config !== 'undefined') {
        const firebaseConfig = JSON.parse(__firebase_config);
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const firestoreDb = getFirestore(app);
        setDb(firestoreDb);

        if (typeof __app_id !== 'undefined') setAppId(__app_id);

        const initAuth = async () => {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
          } else {
            await signInAnonymously(auth);
          }
        };
        initAuth();

        const unsubscribe = onAuthStateChanged(auth, setUser);
        return () => unsubscribe();
      }
    } catch (error) {
      console.error("Firebase init error", error);
    }
  }, []);

  const saveGame = async () => {
    if (!user || !db) return setSaveStatus("Error: No connection.");
    setSaveStatus("Saving...");
    try {
      const saveRef = doc(db, 'artifacts', appId, 'users', user.uid, 'savegames', 'slot1');
      await setDoc(saveRef, { gameState, playerInfo });
      setSaveStatus("Saved successfully!");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (error) {
      setSaveStatus("Error saving.");
    }
  };

  const loadGame = async () => {
    if (!user || !db) return setSaveStatus("Error: No connection.");
    setSaveStatus("Loading...");
    try {
      const saveRef = doc(db, 'artifacts', appId, 'users', user.uid, 'savegames', 'slot1');
      const docSnap = await getDoc(saveRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGameState(data.gameState);
        setPlayerInfo(data.playerInfo);
        setSaveStatus("Loaded successfully!");
        setTimeout(() => setSaveStatus(""), 3000);
      } else {
        setSaveStatus("No save found.");
        setTimeout(() => setSaveStatus(""), 3000);
      }
    } catch (error) {
      setSaveStatus("Error loading.");
    }
  };

  const addLog = (text, type = 'normal') => {
    setPlayerInfo(prev => ({
      ...prev,
      logs: [...prev.logs, { text, type }]
    }));
  };

  // --- Start Flow ---
  const handleSelectCharacter = (id) => {
    setPlayerInfo(prev => ({
      ...prev,
      characterId: id,
      logs: []
    }));
    setGameState('wealth');
  };

  const rollWealth = () => {
    const roll = Math.random();
    let level = 'Medium Wealth';
    let startMoney = 25;
    let startFood = 15;
    let startSupplies = 5;

    if (roll < 0.33) {
      level = 'Poor';
      startMoney = 5;
      startFood = 8;
      startSupplies = 0;
    } else if (roll > 0.66) {
      level = 'Wealthy';
      startMoney = 80;
      startFood = 30;
      startSupplies = 15;
    }

    let wealthText = "You arrived with medium wealth. You have a few tools and some food to start your new life.";
    if (level === 'Poor') wealthText = "You arrived very poor. You spent all your money just to get here. It will be a hard journey.";
    if (level === 'Wealthy') wealthText = "You arrived wealthy! You brought plenty of money and supplies to start a business.";

    setPlayerInfo(prev => ({
      ...prev,
      wealthLevel: level,
      money: startMoney,
      food: startFood,
      supplies: startSupplies,
      housingIndex: 0,
      logs: [{ text: wealthText, type: 'event' }]
    }));
    setGameState('intro');
  };

  const startLoop = () => {
    const char = CHARACTERS[playerInfo.characterId];
    addLog(`You unpack your things. You will need to work hard, gather supplies, and buy ${char.foodName} to survive.`, 'event');
    setGameState('loop');
  };

  // --- Core Game Loop Logic ---
  const processDay = (newMoney, newFood, newSupplies, newHousingIndex, actionText) => {
    const currentDay = playerInfo.day;
    let actualFood = newFood;
    
    // Daily food consumption
    actualFood -= 1;
    
    let eventText = "";
    let finalMoney = newMoney;
    let finalSupplies = newSupplies;

    // Random Events (25% chance)
    if (Math.random() < 0.25) {
      const events = [
        { msg: "Good luck! You found a hidden gold nugget in the dirt! (+$10)", m: 10, f: 0, s: 0 },
        { msg: "A friendly neighbor shared their dinner with you. (+3 Food)", m: 0, f: 3, s: 0 },
        { msg: "Oh no! A fire broke out in the wooden city. You lost some supplies. (-3 Supplies)", m: 0, f: 0, s: -3 },
        { msg: "Thick, cold fog rolled in from the bay. You got sick and needed extra rest. (-2 Food)", m: 0, f: -2, s: 0 },
        { msg: "You found some extra wooden boards near the docks. (+5 Supplies)", m: 0, f: 0, s: 5 }
      ];
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      eventText = randomEvent.msg;
      finalMoney += randomEvent.m;
      actualFood += randomEvent.f;
      finalSupplies += randomEvent.s;
    }

    // Ensure stats don't go below 0
    actualFood = Math.max(0, actualFood);
    finalMoney = Math.max(0, finalMoney);
    finalSupplies = Math.max(0, finalSupplies);

    const nextDay = currentDay + 1;

    // Update State
    setPlayerInfo(prev => {
      const nextLogs = [...prev.logs, { text: `Day ${currentDay}: ${actionText}`, type: 'action' }];
      if (eventText) {
        nextLogs.push({ text: `EVENT: ${eventText}`, type: 'event' });
      }
      if (actualFood === 0) {
        nextLogs.push({ text: "WARNING: You have no food left! You are too weak to work hard tomorrow. You must get food.", type: 'warning' });
      }

      return {
        ...prev,
        day: nextDay,
        money: finalMoney,
        food: actualFood,
        supplies: finalSupplies,
        housingIndex: newHousingIndex !== undefined ? newHousingIndex : prev.housingIndex,
        logs: nextLogs
      };
    });

    if (nextDay > playerInfo.maxDays) {
      setGameState('end');
    }
  };

  // --- Player Actions ---
  const handleWork = () => {
    if (playerInfo.food <= 0) {
      addLog("You are too hungry to work! Please get some food first.", 'warning');
      return;
    }
    const char = CHARACTERS[playerInfo.characterId];
    
    // Better housing gives a small bonus to work energy
    const housingBonus = playerInfo.housingIndex * 2;
    const earnedMoney = Math.floor(Math.random() * 8) + 5 + housingBonus; 
    
    processDay(
      playerInfo.money + earnedMoney,
      playerInfo.food - 1, // extra food cost for working hard
      playerInfo.supplies,
      playerInfo.housingIndex,
      `You ${char.workVerb} and earned $${earnedMoney}.`
    );
  };

  const handleBuyFood = () => {
    const char = CHARACTERS[playerInfo.characterId];
    if (playerInfo.money >= 5) {
      processDay(
        playerInfo.money - 5,
        playerInfo.food + 5,
        playerInfo.supplies,
        playerInfo.housingIndex,
        `You spent $5 to buy fresh ${char.foodName}.`
      );
    } else {
      // Foraging fallback if poor
      const foundFood = Math.floor(Math.random() * 3) + 1;
      processDay(
        playerInfo.money,
        playerInfo.food + foundFood,
        playerInfo.supplies,
        playerInfo.housingIndex,
        `You had no money, so you searched the hills for wild berries. (+${foundFood} Food)`
      );
    }
  };

  const handleBuySupplies = () => {
    if (playerInfo.money >= 10) {
      processDay(
        playerInfo.money - 10,
        playerInfo.food,
        playerInfo.supplies + 5,
        playerInfo.housingIndex,
        `You spent $10 to buy 5 wood and canvas supplies.`
      );
    } else {
      addLog("You need at least $10 to buy supplies.", 'warning');
    }
  };

  const handleUpgradeHousing = () => {
    const nextLevelIndex = playerInfo.housingIndex + 1;
    if (nextLevelIndex >= HOUSING_LEVELS.length) {
      addLog("You already have the best house in the city!", 'warning');
      return;
    }

    const nextHousing = HOUSING_LEVELS[nextLevelIndex];
    if (playerInfo.money >= nextHousing.costMoney && playerInfo.supplies >= nextHousing.costSupplies) {
      processDay(
        playerInfo.money - nextHousing.costMoney,
        playerInfo.food,
        playerInfo.supplies - nextHousing.costSupplies,
        nextLevelIndex,
        `SUCCESS! You built a ${nextHousing.name}! It will help you rest better.`
      );
    } else {
      addLog(`To build a ${nextHousing.name}, you need $${nextHousing.costMoney} and ${nextHousing.costSupplies} Supplies.`, 'warning');
    }
  };

  const resetGame = () => {
    setGameState('title');
    setPlayerInfo({
      characterId: null,
      wealthLevel: null,
      day: 1,
      maxDays: 30,
      money: 0,
      food: 0,
      supplies: 0,
      housingIndex: 0,
      logs: []
    });
  };

  // --- Render Helpers ---
  const renderHeader = () => (
    <div className="flex justify-between items-center border-b-4 border-white pb-4 mb-4">
      <div>
        <h1 className="text-xl md:text-2xl uppercase tracking-widest text-center md:text-left">GOLD RUSH</h1>
      </div>
      <div className="flex flex-col md:flex-row gap-4 items-end md:items-center text-xs md:text-sm">
        <span className="text-gray-400">{saveStatus}</span>
        <button onClick={saveGame} className="hover:bg-white hover:text-black px-2 py-1 transition-colors border border-transparent hover:border-white">SAVE</button>
        <button onClick={loadGame} className="hover:bg-white hover:text-black px-2 py-1 transition-colors border border-transparent hover:border-white">LOAD</button>
      </div>
    </div>
  );

  const renderTitle = () => (
    <div className="flex flex-col items-center justify-center h-full space-y-12">
      <div className="text-center space-y-6">
        <h2 className="text-4xl md:text-6xl border-y-4 border-white py-6 px-8 uppercase tracking-widest animate-pulse">
          GOLD RUSH
        </h2>
        <p className="text-sm md:text-lg text-gray-300">A Historical Adventure in 1849 San Francisco</p>
      </div>
      <button 
        onClick={() => setGameState('select')}
        className="text-xl md:text-2xl border-2 border-white px-8 py-4 hover:bg-white hover:text-black transition-colors"
      >
        Press to Start
      </button>
    </div>
  );

  const renderSelect = () => (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      <p className="text-lg md:text-xl mb-8 leading-loose">Hundreds of thousands of people traveled to California during the Gold Rush. They came from all over the world to build the city of San Francisco.</p>
      <p className="text-lg md:text-xl mb-4 text-yellow-400">Choose who you will be:</p>
      
      <div className="space-y-4 pl-2 md:pl-8">
        {Object.values(CHARACTERS).map((char, index) => (
          <button
            key={char.id}
            onClick={() => handleSelectCharacter(char.id)}
            className="block w-full text-left text-sm md:text-base p-3 hover:bg-white hover:text-black transition-colors border border-gray-700 hover:border-white focus:outline-none"
          >
            [ {index + 1} ] {char.title}
          </button>
        ))}
      </div>
    </div>
  );

  const renderWealthRoll = () => (
    <div className="flex flex-col items-center justify-center h-full space-y-10">
      <p className="text-lg md:text-xl text-center max-w-2xl leading-loose text-blue-300">
        {CHARACTERS[playerInfo.characterId].journey}
      </p>
      <p className="text-center text-sm md:text-base text-gray-300 max-w-2xl leading-loose">
        When people arrived in San Francisco, wealth changed everything. Some people had tools and money, while others had absolutely nothing but their skills.
      </p>
      <button 
        onClick={rollWealth}
        className="text-lg border-2 border-white px-6 py-4 hover:bg-white hover:text-black transition-colors animate-pulse"
      >
        Check your pockets...
      </button>
    </div>
  );

  const renderIntro = () => {
    const char = CHARACTERS[playerInfo.characterId];
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-8">
        <h3 className="text-2xl text-yellow-400 uppercase">You are {playerInfo.wealthLevel}</h3>
        <div className="max-w-2xl border-2 border-white p-6 space-y-4 bg-gray-900">
          <p className="text-sm md:text-base leading-loose">{playerInfo.logs[0].text}</p>
          <div className="border-t border-gray-600 pt-4 text-sm space-y-2">
            <p>Starting Money: <span className="text-green-400">${playerInfo.money}</span></p>
            <p>Starting Food: <span className="text-yellow-400">{playerInfo.food} lbs</span></p>
            <p>Starting Supplies: <span className="text-blue-300">{playerInfo.supplies} units</span></p>
          </div>
          <p className="text-sm text-gray-400 mt-4 italic">You have {playerInfo.maxDays} days to build your life in the city.</p>
        </div>
        <button 
          onClick={startLoop}
          className="text-lg border-2 border-white px-8 py-4 hover:bg-white hover:text-black transition-colors"
        >
          Begin Day 1
        </button>
      </div>
    );
  };

  const renderLoop = () => {
    const char = CHARACTERS[playerInfo.characterId];
    const currentHousing = HOUSING_LEVELS[playerInfo.housingIndex];
    const nextHousing = HOUSING_LEVELS[playerInfo.housingIndex + 1];

    return (
      <div className="flex flex-col h-full">
        {/* Top Status Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 mb-4 p-3 border-2 border-white text-[10px] md:text-xs bg-gray-900">
          <div className="col-span-2 md:col-span-1 text-yellow-400">Day: {playerInfo.day} of {playerInfo.maxDays}</div>
          <div className="text-green-400">Money: ${playerInfo.money}</div>
          <div className="text-yellow-200">Food: {playerInfo.food} lbs</div>
          <div className="text-blue-300">Supplies: {playerInfo.supplies}</div>
          <div className="col-span-2 md:col-span-1 text-pink-300">Home: {currentHousing.name}</div>
        </div>

        {/* Text Log Console */}
        <div className="flex-1 overflow-y-auto mb-4 p-4 border-2 border-gray-700 bg-black space-y-3 relative">
          <div className="absolute inset-0 scanlines z-0"></div>
          <div className="relative z-10 space-y-4">
            {playerInfo.logs.map((log, i) => (
              <p key={i} className={`text-xs md:text-sm leading-loose ${
                log.type === 'action' ? 'text-white' :
                log.type === 'event' ? 'text-blue-300' :
                log.type === 'warning' ? 'text-red-400 animate-pulse' : 'text-gray-300'
              }`}>
                {log.text}
              </p>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-auto">
          <button onClick={handleWork} className="text-left text-xs md:text-sm p-3 border border-gray-500 hover:bg-white hover:text-black transition-colors">
            [ 1 ] Work: {char.workNoun}
          </button>
          <button onClick={handleBuyFood} className="text-left text-xs md:text-sm p-3 border border-gray-500 hover:bg-white hover:text-black transition-colors">
            [ 2 ] Buy Food: {char.foodName} ($5)
          </button>
          <button onClick={handleBuySupplies} className="text-left text-xs md:text-sm p-3 border border-gray-500 hover:bg-white hover:text-black transition-colors">
            [ 3 ] Buy Building Supplies ($10)
          </button>
          
          {nextHousing ? (
            <button onClick={handleUpgradeHousing} className="text-left text-xs md:text-sm p-3 border border-yellow-600 hover:bg-yellow-400 hover:text-black transition-colors">
              [ 4 ] Upgrade to {nextHousing.name} (${nextHousing.costMoney}, {nextHousing.costSupplies} Sup)
            </button>
          ) : (
            <button disabled className="text-left text-xs md:text-sm p-3 border border-gray-800 text-gray-600 cursor-not-allowed">
              [ House Fully Upgraded ]
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderEnd = () => {
    const char = CHARACTERS[playerInfo.characterId];
    const finalHousing = HOUSING_LEVELS[playerInfo.housingIndex];
    
    let scorePhrase = "Life was very hard, but you survived the Gold Rush.";
    if (playerInfo.housingIndex === 1) scorePhrase = "You built a comfortable life in the growing city of San Francisco.";
    if (playerInfo.housingIndex === 2) scorePhrase = "You became a very successful settler and helped shape the great city of San Francisco!";

    return (
      <div className="flex flex-col h-full items-center justify-center space-y-6 text-center max-w-3xl mx-auto pb-10 overflow-y-auto">
        <h2 className="text-3xl md:text-5xl text-yellow-400 mb-2 mt-8">Time is up!</h2>
        
        <div className="p-6 border-4 border-white space-y-6 bg-gray-900 w-full text-left">
          <p className="text-lg md:text-xl text-center text-blue-300 uppercase tracking-widest mb-6">
            Your Life in 1849
          </p>
          
          <div className="space-y-4 text-sm md:text-base leading-loose">
            <p>You arrived as a <span className="text-yellow-300">{char.title}</span>.</p>
            <p>{scorePhrase}</p>
            <p className="border-l-4 border-yellow-500 pl-4 text-gray-300 italic">{char.tips}</p>
          </div>

          <div className="border-t border-gray-600 pt-4 mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>Final Money: <span className="text-green-400">${playerInfo.money}</span></div>
            <div>Final Food: <span className="text-yellow-400">{playerInfo.food} lbs</span></div>
            <div>Final Supplies: <span className="text-blue-300">{playerInfo.supplies}</span></div>
            <div className="col-span-2">Final Home: <span className="text-pink-300">{finalHousing.name}</span></div>
          </div>
        </div>

        <button 
          onClick={resetGame}
          className="text-lg border-2 border-white px-8 py-4 hover:bg-white hover:text-black transition-colors mt-6"
        >
          Play Again
        </button>
      </div>
    );
  };

  return (
    <>
      <style>{PIXEL_FONT}</style>
      <div className="min-h-screen bg-black text-white font-pixel p-2 md:p-8 selection:bg-white selection:text-black">
        {/* Retro Monitor Bezel */}
        <div className="max-w-5xl mx-auto border-4 md:border-8 border-gray-800 rounded-3xl p-2 md:p-4 bg-gray-900 shadow-[0_0_50px_rgba(0,0,0,0.8)] inset-0">
          <div className="h-[88vh] overflow-hidden rounded-xl border-2 border-gray-700 bg-black p-4 md:p-6 flex flex-col relative">
            
            {gameState !== 'title' && renderHeader()}
            
            <div className="flex-1 overflow-y-hidden z-10 relative">
              {gameState === 'title' && renderTitle()}
              {gameState === 'select' && renderSelect()}
              {gameState === 'wealth' && renderWealthRoll()}
              {gameState === 'intro' && renderIntro()}
              {gameState === 'loop' && renderLoop()}
              {gameState === 'end' && renderEnd()}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
