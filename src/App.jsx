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

// --- Weekly Narrative Events ---
const STORY_EVENTS = {
  american: {
    Poor: {
      7: { title: "A Hard Week", text: "Your boots are already wearing out from the mud. You walked to Portsmouth Square and saw merchant Sam Brannan shouting 'Gold! Gold!' but you could not afford his expensive shovels.", rewardText: "You found a discarded piece of canvas to wrap your feet. (+2 Supplies)", m: 0, f: 0, s: 2 },
      14: { title: "Camp Rules", text: "You joined a small mining camp. The miners hold a meeting to create their own rules for claiming land. Because you are an American, they let you vote on the new rules.", rewardText: "They share a meal of bacon and beans with you. (+5 Food)", m: 0, f: 5, s: 0 },
      21: { title: "Sickness in the Mud", text: "Standing in the freezing river water has made you very sick. You had to stay in your muddy tent for two whole days without working.", rewardText: "You had to pay a doctor for medicine. (-5 Money)", m: -5, f: 0, s: 0 },
      28: { title: "A Lucky Strike", text: "After weeks of back-breaking work in the dry diggings, you finally found a small pocket of shiny gold flakes hidden under a heavy rock!", rewardText: "You sold the flakes in town! (+20 Money)", m: 20, f: 0, s: 0 }
    },
    Medium: {
      7: { title: "The Rocker Box", text: "You used your savings to buy a rocker box. It is a wooden cradle that helps you wash dirt much faster than a simple pan. The work is still very hard.", rewardText: "The rocker box helps you find more gold! (+10 Money)", m: 10, f: 0, s: 0 },
      14: { title: "A Letter Home", text: "You paid to send a letter back east. You wrote about the massive ships abandoned in the harbor and how a single egg costs a whole dollar here!", rewardText: "Writing home makes you feel better. (+3 Food)", m: 0, f: 3, s: 0 },
      21: { title: "Building a Shack", text: "You decided to stop living in a tent. You bought some expensive wooden planks and built a rough shack. It keeps the cold wind out at night.", rewardText: "You used up some supplies to build it. (-5 Supplies)", m: 0, f: 0, s: -5 },
      28: { title: "A New Business", text: "You realized that selling goods is safer than digging in the mud. You used your tools to help build a general store in the growing city.", rewardText: "The store owner paid you well! (+15 Money)", m: 15, f: 0, s: 0 }
    },
    Wealthy: {
      7: { title: "City Investments", text: "Instead of digging in the dirt, you rented a nice hotel room. You met with Sam Brannan and invested your money in a new shipping company.", rewardText: "Your investments are paying off! (+25 Money)", m: 25, f: 0, s: 0 },
      14: { title: "Fresh Food", text: "Fresh vegetables are incredibly rare and expensive in the mining camps. You used your wealth to buy imported potatoes and fresh meat for dinner.", rewardText: "A wonderful meal! (+10 Food)", m: 0, f: 10, s: 0 },
      21: { title: "Hiring Workers", text: "You bought a large plot of land in San Francisco and hired a team of workers to build a beautiful wooden storefront for your new business.", rewardText: "You spent money, but gained lots of building supplies. (-15 Money, +20 Supplies)", m: -15, f: 0, s: 20 },
      28: { title: "A Booming Town", text: "You attended a fancy civic meeting to help plan the new streets of San Francisco. You are becoming a very important leader in the city.", rewardText: "Other leaders gave you gifts to earn your favor. (+20 Money)", m: 20, f: 0, s: 0 }
    }
  },
  californio: {
    Poor: {
      7: { title: "Working the Rancho", text: "You work as a vaquero, caring for cattle. Since the Americans arrived, many Californios are losing their jobs, but your skills with a horse keep you employed.", rewardText: "The rancho owner gave you some dried beef. (+5 Food)", m: 0, f: 5, s: 0 },
      14: { title: "Unfair Changes", text: "You traveled to San Francisco, but everything is changing. They even changed the name of the town from Yerba Buena! You feel like a stranger in your own home.", rewardText: "You found some wild squash to eat on the journey. (+3 Food)", m: 0, f: 3, s: 0 },
      21: { title: "Pushed Out", text: "You tried to mine for gold, but a group of angry newcomers forced you off your claim. They said the land belonged to them now.", rewardText: "You lost some money running away. (-5 Money)", m: -5, f: 0, s: 0 },
      28: { title: "Guiding the Newcomers", text: "Even though things are unfair, you know this land better than anyone. You earned money by guiding a wagon train safely through the mountain passes.", rewardText: "They paid you for your expert knowledge. (+15 Money)", m: 15, f: 0, s: 0 }
    },
    Medium: {
      7: { title: "The Cattle Market", text: "You rode your horse into the busy city to sell cattle from your family rancho. The hungry miners gladly bought your fresh beef and corn tortillas.", rewardText: "A very successful trade! (+15 Money)", m: 15, f: 0, s: 0 },
      14: { title: "Meeting Vallejo", text: "You spoke with Mariano Vallejo, a famous Californio leader. He warned you that the new American laws might try to take away your family's land documents.", rewardText: "You bought legal papers to protect your land. (-10 Money, +5 Supplies)", m: -10, f: 0, s: 5 },
      21: { title: "Protecting the Borders", text: "Squatters tried to build tents on your family's land. You and your friends had to ride out and firmly tell them to leave your property.", rewardText: "You spent energy defending your home. (-3 Food)", m: 0, f: -3, s: 0 },
      28: { title: "A Changing City", text: "You used your money to buy better riding boots and a beautiful new serape blanket. You are proud of your Californio heritage.", rewardText: "You feel confident and strong. (+5 Money)", m: 5, f: 0, s: 0 }
    },
    Wealthy: {
      7: { title: "A Grand Feast", text: "You hosted a massive feast at your large adobe home. You served fresh beef, chile sauces, and imported chocolate to your guests.", rewardText: "It cost a lot of food, but you made important friends. (-10 Food, +20 Money)", m: 20, f: -10, s: 0 },
      14: { title: "Legal Battles", text: "The new government is forcing you to prove that you own your rancho. You had to hire very expensive lawyers to translate your Spanish land documents into English.", rewardText: "The lawyers cost a fortune. (-25 Money)", m: -25, f: 0, s: 0 },
      21: { title: "Feeding the Boomtown", text: "San Francisco is starving. You organized a massive cattle drive, bringing hundreds of cows from your rancho to the city butchers.", rewardText: "You made incredible profits feeding the city! (+30 Money)", m: 30, f: 0, s: 0 },
      28: { title: "A Town House", text: "To stay close to the lawyers and the markets, you built a beautiful new town house right in the center of San Francisco.", rewardText: "You spent your supplies on the new house. (-15 Supplies, +10 Money)", m: 10, f: 0, s: -15 }
    }
  },
  latinAmerican: {
    Poor: {
      7: { title: "The Batea", text: "You use your batea, a special wooden bowl from Chile, to wash gravel. Your expert skills help you find gold faster than the newcomers with their metal pans.", rewardText: "Your skills pay off! (+10 Money)", m: 10, f: 0, s: 0 },
      14: { title: "Unfair Taxes", text: "An angry tax collector arrived at your camp. He forced you to pay the Foreign Miners Tax just because you speak Spanish. It is incredibly unfair.", rewardText: "He took your hard-earned money. (-10 Money)", m: -10, f: 0, s: 0 },
      21: { title: "A Taste of Home", text: "You sat by the campfire with other Chilean and Mexican miners. You shared a simple meal of beans, dried meat, and hot chile.", rewardText: "The community meal filled your belly. (+5 Food)", m: 0, f: 5, s: 0 },
      28: { title: "Leaving the River", text: "The mining camps have become too dangerous and unfair. You packed up your tent and decided to look for safe work in San Francisco instead.", rewardText: "You gathered some wild food on the walk to town. (+4 Food)", m: 0, f: 4, s: 0 }
    },
    Medium: {
      7: { title: "Silver Mining Tricks", text: "You used ancient silver mining tricks from Sonora, Mexico to dig deep into the hills. You found a hidden vein of gold that the Americans walked right past!", rewardText: "A brilliant discovery! (+20 Money)", m: 20, f: 0, s: 0 },
      14: { title: "The Strong Mule", text: "You bought a strong mule to help carry your heavy bags of flour and beans. Having an animal makes life in the mountains much easier.", rewardText: "The mule helps you carry extra supplies. (+10 Supplies)", m: 0, f: 0, s: 10 },
      21: { title: "Moving Away", text: "To avoid the unfair tax collectors, you moved your camp high into the mountains. It is colder up here, but much safer for your group.", rewardText: "You lost some food during the long move. (-4 Food)", m: 0, f: -4, s: 0 },
      28: { title: "A Small Shop", text: "You realized that selling food is better than digging. You used your money to open a small shop selling tortillas and rice to other miners.", rewardText: "Your shop is a big success! (+15 Money)", m: 15, f: 0, s: 0 }
    },
    Wealthy: {
      7: { title: "The Mule Train", text: "You organized a massive mule train, carrying heavy mining equipment and imported food all the way from the port of Peru to the gold fields.", rewardText: "You made a huge profit selling the goods. (+30 Money)", m: 30, f: 0, s: 0 },
      14: { title: "A Hotel in Town", text: "Instead of sleeping in a dusty tent, you rented a luxurious hotel room in San Francisco. You eat fresh meat and drink real coffee every morning.", rewardText: "A wonderfully restful week. (+10 Food)", m: 0, f: 10, s: 0 },
      21: { title: "Financing the Experts", text: "You used your wealth to hire a team of expert Latin American miners. You pay for their food, and they give you a share of the gold they find.", rewardText: "Your team found a huge gold deposit! (+25 Money)", m: 25, f: 0, s: 0 },
      28: { title: "Fighting the Law", text: "You joined a group of wealthy merchants to protest the unfair tax laws against Latin Americans. It is a hard fight, but you are a respected leader.", rewardText: "You spent money to hire lawyers for the community. (-15 Money)", m: -15, f: 0, s: 0 }
    }
  },
  chinese: {
    Poor: {
      7: { title: "The Bamboo Pole", text: "You carry your heavy supplies using a bamboo shoulder pole and baskets, just like back home in Guangdong. You are working very hard on Gum Shan, the Gold Mountain.", rewardText: "You found some wild greens to cook with your rice. (+4 Food)", m: 0, f: 4, s: 0 },
      14: { title: "Abandoned Claims", text: "The white miners force you to leave the best spots. You have to carefully wash the leftover gravel they abandoned. Because you are patient, you still find small flakes of gold.", rewardText: "Your hard work pays off. (+10 Money)", m: 10, f: 0, s: 0 },
      21: { title: "The Tax Collector", text: "An angry man came to your camp and forced you to pay a special tax just because you are an immigrant. It was incredibly unfair, but you had to pay to stay safe.", rewardText: "He took your hard-earned money. (-10 Money)", m: -10, f: 0, s: 0 },
      28: { title: "A Letter Home", text: "You paid a merchant to send a letter back across the Pacific Ocean to your family. You told them about the muddy tents and the difficult work.", rewardText: "You feel homesick, but determined. (+2 Supplies)", m: 0, f: 0, s: 2 }
    },
    Medium: {
      7: { title: "The Laundry Business", text: "Miners get very dirty! You and your friends started a laundry business near the river. It is exhausting work, but the miners gladly pay you to wash their shirts.", rewardText: "The business is making good money! (+15 Money)", m: 15, f: 0, s: 0 },
      14: { title: "Herbal Medicine", text: "You felt very sick from the cold fog. You visited a Chinese merchant and bought traditional herbal medicines that made you feel much better.", rewardText: "The medicine cost money, but cured you. (-5 Money, +5 Food)", m: -5, f: 5, s: 0 },
      21: { title: "Building Chinatown", text: "You helped your neighbors build safe wooden houses in a special neighborhood in San Francisco. Everyone works together to create a community.", rewardText: "You used your supplies to help build. (-5 Supplies, +10 Money)", m: 10, f: 0, s: -5 },
      28: { title: "Preserved Foods", text: "A ship arrived from China! You bought delicious preserved fish, tea, and noodles. It tastes exactly like home.", rewardText: "A wonderful meal! (+8 Food)", m: 0, f: 8, s: 0 }
    },
    Wealthy: {
      7: { title: "The Dry Goods Store", text: "You used your savings to open a large dry goods store in Chinatown. You sell imported rice, tea, and mining tools to the new arrivals.", rewardText: "Your store is incredibly successful! (+25 Money)", m: 25, f: 0, s: 0 },
      14: { title: "Helping the Community", text: "Many new immigrants arrive with no money. You use your wealth to help them find safe boarding houses and get jobs in the city.", rewardText: "You gave away some food to help them. (-10 Food)", m: 0, f: -10, s: 0 },
      21: { title: "Association Leader", text: "You became a leader in the district association. You meet with other wealthy merchants to protect the community from unfair city laws.", rewardText: "You bought legal papers to defend your friends. (-15 Money, +10 Supplies)", m: -15, f: 0, s: 10 },
      28: { title: "A Safe Building", text: "To protect your business from the frequent city fires, you built a beautiful, sturdy wooden building with special storage rooms.", rewardText: "You spent your supplies, but your business is secure. (-20 Supplies, +15 Money)", m: 15, f: 0, s: -20 }
    }
  },
  hawaiian: {
    Poor: {
      7: { title: "The Busy Docks", text: "You use your incredible strength to unload heavy wooden crates from the ships arriving in San Francisco. The city needs workers like you to survive.", rewardText: "The ship captain paid you for your hard work. (+10 Money)", m: 10, f: 0, s: 0 },
      14: { title: "An Abandoned Ship", text: "You could not afford a tent, so you found a place to sleep on the deck of a massive ship that miners abandoned in the harbor. It is cold and damp.", rewardText: "You found some leftover ship biscuits. (+4 Food)", m: 0, f: 4, s: 0 },
      21: { title: "Fixing the Mast", text: "A strong storm damaged a boat. You used your expert Pacific sailing skills to climb up and fix the broken ropes and mast.", rewardText: "They gave you extra supplies for your brave help! (+8 Supplies)", m: 0, f: 0, s: 8 },
      28: { title: "Up the River", text: "You got a job rowing a small boat full of supplies up the Sacramento River. It took days of heavy rowing to reach the mining camps.", rewardText: "You earned good money on the river! (+15 Money)", m: 15, f: 0, s: 0 }
    },
    Medium: {
      7: { title: "Navigating the Waters", text: "You steered a large boat full of excited miners up the river. The water was rough, but your ocean navigation skills kept everyone perfectly safe.", rewardText: "The miners tipped you well! (+15 Money)", m: 15, f: 0, s: 0 },
      14: { title: "A Cold Climate", text: "The weather here in California is much colder than the Sandwich Islands! You had to buy a heavy wool coat to stay warm in the fog.", rewardText: "The coat was expensive. (-8 Money)", m: -8, f: 0, s: 0 },
      21: { title: "Fresh Catch", text: "Instead of eating boring beans, you used your fishing skills to catch a huge net of fresh fish from the Bay for dinner.", rewardText: "A delicious and healthy meal! (+10 Food)", m: 0, f: 10, s: 0 },
      28: { title: "Waterfront Room", text: "You rented a shared room in a boarding house right on the waterfront. You trade stories and goods with sailors arriving from all over the world.", rewardText: "You traded some food for useful supplies. (-3 Food, +6 Supplies)", m: 0, f: -3, s: 6 }
    },
    Wealthy: {
      7: { title: "Cargo Coordinator", text: "You manage the cargo for a whole fleet of ships arriving from the Pacific. You make sure the food and tools get safely to the warehouses.", rewardText: "Your business is booming! (+25 Money)", m: 25, f: 0, s: 0 },
      14: { title: "Pacific Trade", text: "You met with wealthy merchants to sell special goods brought all the way from the islands. Your trade connections make you very important to the city.", rewardText: "You secured a great trade deal. (+15 Supplies)", m: 0, f: 0, s: 15 },
      21: { title: "A Private Room", text: "You rented a private, quiet room in a very nice hotel. You enjoy eating fresh bread and roasted meat at the restaurant downstairs.", rewardText: "You rested well and ate wonderfully. (+10 Food)", m: 0, f: 10, s: 0 },
      28: { title: "Hiring a Crew", text: "You bought your own large riverboat and hired other expert islanders to work for you. You are building a powerful transport business.", rewardText: "You invested heavily in the boat. (-20 Money, +20 Supplies)", m: -20, f: 0, s: 20 }
    }
  },
  australian: {
    Poor: {
      7: { title: "Muddy Work", text: "You walked through the freezing, muddy waterfront looking for odd jobs. You helped haul lumber to build a new saloon.", rewardText: "You earned a small wage and a meal. (+8 Money, +3 Food)", m: 8, f: 3, s: 0 },
      14: { title: "Suspicious Neighbors", text: "Some people call Australians the 'Sydney Ducks' and think you are criminals. People were suspicious of you today, making it hard to find work.", rewardText: "You had to buy expensive food because no one would share. (-5 Money)", m: -5, f: 0, s: 0 },
      21: { title: "Patching the Canvas", text: "The heavy wind tore a hole right through your cheap canvas tent. You spent all evening trying to sew it back together.", rewardText: "You used up your spare supplies to fix it. (-4 Supplies)", m: 0, f: 0, s: -4 },
      28: { title: "A Friendly Pub", text: "You found a small pub where other working-class Australians gather. You shared tea, salt meat, and stories of home.", rewardText: "The community cheered you up. (+5 Food)", m: 0, f: 5, s: 0 }
    },
    Medium: {
      7: { title: "The Skilled Carpenter", text: "You brought your carpenter tools all the way from Sydney. You spent the week fixing broken wheels and wagons for the miners heading inland.", rewardText: "Skilled trades pay very well! (+20 Money)", m: 20, f: 0, s: 0 },
      14: { title: "Wooden Sidewalks", text: "San Francisco is so muddy that horses get stuck in the street! You were hired to help build wooden sidewalks so people can walk safely.", rewardText: "You gained lots of leftover building materials. (+10 Supplies)", m: 0, f: 0, s: 10 },
      21: { title: "A Warm Coat", text: "The Bay fog is freezing cold. You used your earnings to buy a thick wool coat and a hearty meat stew at the local boarding house.", rewardText: "You spent money, but feel great. (-8 Money, +8 Food)", m: -8, f: 8, s: 0 },
      28: { title: "The Repair Shop", text: "You gathered enough wood and canvas to set up your own small repair shop near the docks. You are officially a business owner!", rewardText: "You used your supplies to build the shop. (-10 Supplies, +15 Money)", m: 15, f: 0, s: -10 }
    },
    Wealthy: {
      7: { title: "The Warehouse", text: "You arrived with plenty of capital. You bought a massive warehouse space right near the docks to store imported goods.", rewardText: "Your real estate investment is incredibly valuable. (+25 Money)", m: 25, f: 0, s: 0 },
      14: { title: "Importing Tools", text: "A ship arrived carrying high-quality shovels and picks that you ordered from Sydney. You will sell them to the miners for a huge profit.", rewardText: "You gained a massive amount of inventory! (+20 Supplies)", m: 0, f: 0, s: 20 },
      21: { title: "Hiring Workers", text: "Your business is growing so fast that you had to hire clerks and dock workers to help you move all the heavy crates.", rewardText: "You paid your workers a fair wage. (-15 Money)", m: -15, f: 0, s: 0 },
      28: { title: "A Fine Hotel", text: "You stay in one of the finest hotels in San Francisco. You wear a formal suit and attend meetings with the city's top leaders.", rewardText: "You enjoyed an expensive, luxurious dinner. (+12 Food)", m: 0, f: 12, s: 0 }
    }
  },
  africanAmerican: {
    Poor: {
      7: { title: "Camp Cook", text: "You work exhausting hours cooking huge pots of beans and salt pork for a crowded mining camp. It is hard work, but you are building a life in a free state.", rewardText: "You get to keep some of the leftover food. (+8 Food)", m: 0, f: 8, s: 0 },
      14: { title: "Meeting Leaders", text: "You met Mifflin Wistar Gibbs, a famous African American business leader. He encouraged you to save your money and start your own business someday.", rewardText: "You feel inspired and determined! (+5 Money)", m: 5, f: 0, s: 0 },
      21: { title: "Protecting Papers", text: "Even though California is a free state, there are unfair laws. You have to be very careful to protect your legal papers and stay safe from bad men.", rewardText: "You bought a secure box to hide your documents. (-4 Money)", m: -4, f: 0, s: 0 },
      28: { title: "River Laundry", text: "You started a small business washing miners' clothes in the cold river. Your hands are freezing, but you are earning your own independent wages.", rewardText: "Your hard work is paying off! (+12 Money)", m: 12, f: 0, s: 0 }
    },
    Medium: {
      7: { title: "The Barbershop", text: "You opened a barbershop in town! Miners come down from the hills with long, messy hair. Your shop quickly becomes a popular meeting place.", rewardText: "Business is booming! (+20 Money)", m: 20, f: 0, s: 0 },
      14: { title: "Hot Stews", text: "You built a small kitchen in the back of your shop. You cook hot stews and fresh cornbread. Hungry travelers gladly pay for your delicious food.", rewardText: "You cooked an amazing meal for yourself too. (+10 Food)", m: 0, f: 10, s: 0 },
      21: { title: "Building a Church", text: "You joined other African American families to help build the first community church in the city. You proudly hammered the wooden walls together.", rewardText: "You donated some supplies to the church. (-5 Supplies)", m: 0, f: 0, s: -5 },
      28: { title: "Fighting for Rights", text: "You attended a large meeting to organize and fight against unfair laws that stop Black citizens from testifying in court. You are helping change history.", rewardText: "You donated money to the cause. (-10 Money, +5 Supplies)", m: -10, f: 0, s: 5 }
    },
    Wealthy: {
      7: { title: "The Boarding House", text: "You arrived with enough money to buy a large wooden building. You opened a beautiful, safe boarding house where travelers can rent clean rooms.", rewardText: "Your guests pay you rent in gold dust! (+30 Money)", m: 30, f: 0, s: 0 },
      14: { title: "Fine Dining", text: "Your boarding house is famous for its food. You serve fresh meat, roasted vegetables, and real coffee on nice tables.", rewardText: "You always have plenty of excellent food. (+15 Food)", m: 0, f: 15, s: 0 },
      21: { title: "Civil Rights Leader", text: "Because you are a wealthy business owner, you use your influence to support anti-slavery activism and fund civil rights newspapers in the city.", rewardText: "You spent a lot of money helping the community. (-20 Money)", m: -20, f: 0, s: 0 },
      28: { title: "Investing in Land", text: "You purchased large plots of land outside the city to start a farm and an orchard. You are building incredible wealth for your family's future.", rewardText: "You used your supplies to fence the land. (-15 Supplies, +10 Money)", m: 10, f: 0, s: -15 }
    }
  }
};

// --- Daily NPC Encounters ---
const NPC_ENCOUNTERS = [
  {
    npc: "Sam Brannan (Merchant)",
    description: "Sam Brannan is walking through the mud, loudly advertising his new shipment of mining tools. He offers you a 'special deal' on a high-quality pickaxe.",
    choices: [
      { text: "Buy the pickaxe for $15", m: -15, f: 0, s: 5, log: "You bought the tools. They will help you build your life here." },
      { text: "Refuse his overpriced goods", m: 0, f: 0, s: 0, log: "You ignored Sam Brannan. Keep your money safe from his schemes." }
    ]
  },
  {
    npc: "Exhausted Traveler",
    description: "A young, exhausted traveler approaches you. 'I just arrived from the Panama route. I haven't eaten in two days. Can you spare any food?'",
    choices: [
      { text: "Share your food (-3 Food)", m: 0, f: -3, s: 0, extraM: 10, log: "You shared your food. The traveler thanked you and traded a small gold nugget! (+10 Money)" },
      { text: "Tell them to move along", m: 0, f: 0, s: 0, log: "You kept your food. It is every person for themselves in this boomtown." }
    ]
  },
  {
    npc: "Greedy Miner",
    description: "A rude miner with a heavy shovel approaches your area. 'This looks like my land,' he growls. 'Pay me $10 or pack up your things.'",
    choices: [
      { text: "Pay the bully ($10)", m: -10, f: 0, s: 0, log: "You paid the bully to avoid trouble. It is unfair, but you are safe." },
      { text: "Pack up and move away", m: 0, f: -2, s: -3, log: "You moved your camp safely, but dropped some supplies and food in the rush." }
    ]
  },
  {
    npc: "Levi Strauss (Tailor)",
    description: "A tailor named Levi Strauss is selling thick, durable canvas pants. 'They will not tear in the mines like your wool trousers!' he promises.",
    choices: [
      { text: "Buy the sturdy pants ($12)", m: -12, f: 0, s: 4, log: "You bought the pants. They are incredibly tough! (+4 Supplies)" },
      { text: "Keep wearing your old clothes", m: 0, f: 0, s: 0, log: "You saved your money, but your knees are still muddy." }
    ]
  },
  {
    npc: "Fellow Immigrant",
    description: "Someone from your home region invites you to share a traditional meal around their campfire to celebrate surviving another week.",
    choices: [
      { text: "Join them for dinner", m: 0, f: 5, s: 0, log: "You enjoyed a wonderful, comforting meal with your community. (+5 Food)" },
      { text: "Politely decline to keep working", m: 8, f: 0, s: 0, log: "You kept working instead and found a little extra gold. (+8 Money)" }
    ]
  }
];

export default function App() {
  // --- Firebase State ---
  const [user, setUser] = useState(null);
  const [db, setDb] = useState(null);
  const [appId, setAppId] = useState('gold-rush-a868b');
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

  // --- Modal States ---
  const [activeStoryEvent, setActiveStoryEvent] = useState(null);
  const [activeNpcEvent, setActiveNpcEvent] = useState(null);

  const bottomRef = useRef(null);

  // --- Scroll to Bottom ---
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [playerInfo.logs, gameState, activeStoryEvent, activeNpcEvent]);

  // --- Unified Firebase Initialization (Works for Vercel AND Gemini Canvas) ---
  useEffect(() => {
    try {
      let firebaseConfig;
      let targetAppId = 'gold-rush-a868b';

      // Check if we are running in the Gemini preview environment
      if (typeof __firebase_config !== 'undefined' && __firebase_config) {
        firebaseConfig = JSON.parse(__firebase_config);
        if (typeof __app_id !== 'undefined') targetAppId = __app_id;
      } else {
        // Fallback to Vercel hardcoded keys if outside the preview environment
        firebaseConfig = {
          apiKey: "AIzaSyDfJNUSJi8YJB_f0009JpxJMOzS8hDVVaQ",
          authDomain: "gold-rush-a868b.firebaseapp.com",
          projectId: "gold-rush-a868b",
          storageBucket: "gold-rush-a868b.firebasestorage.app",
          messagingSenderId: "241706324430",
          appId: "1:241706324430:web:bee589ec8d4d74a129db9f"
        };
      }

      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const firestoreDb = getFirestore(app);
      setDb(firestoreDb);
      setAppId(targetAppId); 

      const initAuth = async () => {
        try {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
          } else {
            await signInAnonymously(auth);
          }
        } catch (error) {
          console.error("Auth error", error);
        }
      };
      initAuth();

      const unsubscribe = onAuthStateChanged(auth, setUser);
      return () => unsubscribe();
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
        setActiveStoryEvent(null);
        setActiveNpcEvent(null);
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
    let level = 'Medium';
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

  // --- Core Game Loop Logic (Time advances here) ---
  const advanceDay = (mDelta, fDelta, sDelta, houseIdxUpdate, actionText) => {
    const currentDay = playerInfo.day;
    
    // Calculate new stats (Costing 1 Food per day passing)
    let actualFood = playerInfo.food + fDelta - 1; 
    let actualMoney = playerInfo.money + mDelta;
    let actualSupplies = playerInfo.supplies + sDelta;
    let actualHouse = houseIdxUpdate !== undefined ? houseIdxUpdate : playerInfo.housingIndex;

    let eventText = "";

    // Check for Major Weekly Story Event first
    const storyData = STORY_EVENTS[playerInfo.characterId]?.[playerInfo.wealthLevel]?.[currentDay];
    
    if (storyData) {
      setActiveStoryEvent(storyData);
    } 
    // If no major story, 30% chance for an interactive NPC Event
    else if (Math.random() < 0.30) {
      const randomNpc = NPC_ENCOUNTERS[Math.floor(Math.random() * NPC_ENCOUNTERS.length)];
      setActiveNpcEvent(randomNpc);
    } 
    // If no NPC, 25% chance for a minor random background event
    else if (Math.random() < 0.25) {
      const events = [
        { msg: "Good luck! You found a hidden gold nugget in the dirt! (+$10)", m: 10, f: 0, s: 0 },
        { msg: "A friendly neighbor shared their dinner with you. (+3 Food)", m: 0, f: 3, s: 0 },
        { msg: "Oh no! A fire broke out in the wooden city. You lost some supplies. (-3 Supplies)", m: 0, f: 0, s: -3 },
        { msg: "Thick, cold fog rolled in from the bay. You got sick and needed extra rest. (-2 Food)", m: 0, f: -2, s: 0 },
        { msg: "You found some extra wooden boards near the docks. (+5 Supplies)", m: 0, f: 0, s: 5 }
      ];
      const randomEvent = events[Math.floor(Math.random() * events.length)];
      eventText = randomEvent.msg;
      actualMoney += randomEvent.m;
      actualFood += randomEvent.f;
      actualSupplies += randomEvent.s;
    }

    // Ensure stats do not drop below zero
    actualFood = Math.max(0, actualFood);
    actualMoney = Math.max(0, actualMoney);
    actualSupplies = Math.max(0, actualSupplies);

    const nextDay = currentDay + 1;

    setPlayerInfo(prev => {
      const nextLogs = [...prev.logs, { text: `Day ${currentDay}: ${actionText}`, type: 'action' }];
      
      if (eventText) {
        nextLogs.push({ text: `EVENT: ${eventText}`, type: 'event' });
      }
      
      if (actualFood === 0 && !storyData && !activeNpcEvent) {
        nextLogs.push({ text: "WARNING: You have no food left! You must forage or buy food to survive tomorrow.", type: 'warning' });
      }

      return {
        ...prev,
        day: nextDay,
        money: actualMoney,
        food: actualFood,
        supplies: actualSupplies,
        housingIndex: actualHouse,
        logs: nextLogs
      };
    });

    if (nextDay > playerInfo.maxDays) {
      setGameState('end');
    }
  };

  // --- Handlers for Modals ---
  const dismissStoryEvent = () => {
    const data = activeStoryEvent;
    setPlayerInfo(prev => {
      const newLogs = [...prev.logs, { text: `STORY: ${data.title}. ${data.rewardText}`, type: 'story' }];
      return {
        ...prev,
        money: Math.max(0, prev.money + data.m),
        food: Math.max(0, prev.food + data.f),
        supplies: Math.max(0, prev.supplies + data.s),
        logs: newLogs
      };
    });
    setActiveStoryEvent(null);
  };

  const handleNpcChoice = (choice) => {
    setPlayerInfo(prev => {
      const newLogs = [...prev.logs, { text: `Encounter: ${choice.log}`, type: 'event' }];
      return {
        ...prev,
        money: Math.max(0, prev.money + (choice.m || 0) + (choice.extraM || 0)),
        food: Math.max(0, prev.food + (choice.f || 0)),
        supplies: Math.max(0, prev.supplies + (choice.s || 0)),
        logs: newLogs
      };
    });
    setActiveNpcEvent(null);
  };

  // --- Player Actions ---
  const handleWork = () => {
    if (playerInfo.food <= 0) {
      addLog("You are too hungry to work! Please get some food first.", 'warning');
      return;
    }
    const char = CHARACTERS[playerInfo.characterId];
    const housingBonus = playerInfo.housingIndex * 2;
    const earnedMoney = Math.floor(Math.random() * 8) + 5 + housingBonus; 
    
    // Work takes 1 day
    advanceDay(earnedMoney, 0, 0, undefined, `You ${char.workVerb} and earned $${earnedMoney}.`);
  };

  const handleBuyFood = () => {
    const char = CHARACTERS[playerInfo.characterId];
    if (playerInfo.money >= 5) {
      // Instant Trade - Does NOT take a day
      setPlayerInfo(prev => ({
        ...prev,
        money: prev.money - 5,
        food: prev.food + 5,
        logs: [...prev.logs, { text: `[Quick Trade] You instantly spent $5 to buy fresh ${char.foodName}.`, type: 'action' }]
      }));
    } else {
      // Foraging - Takes 1 day because they have no money
      const foundFood = Math.floor(Math.random() * 3) + 2;
      advanceDay(0, foundFood, 0, undefined, `You had no money, so you spent the day searching the hills for wild berries. (+${foundFood} Food)`);
    }
  };

  const handleBuySupplies = () => {
    if (playerInfo.money >= 10) {
      // Instant Trade - Does NOT take a day
      setPlayerInfo(prev => ({
        ...prev,
        money: prev.money - 10,
        supplies: prev.supplies + 5,
        logs: [...prev.logs, { text: `[Quick Trade] You instantly spent $10 to buy 5 wood and canvas supplies.`, type: 'action' }]
      }));
    } else {
      addLog("You need at least $10 to quickly buy supplies.", 'warning');
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
      // Upgrading takes 1 day of building
      advanceDay(-nextHousing.costMoney, 0, -nextHousing.costSupplies, nextLevelIndex, `SUCCESS! You spent the day building a ${nextHousing.name}!`);
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
    setActiveStoryEvent(null);
    setActiveNpcEvent(null);
  };

  // --- Render Helpers ---
  const renderHeader = () => (
    <div className="shrink-0 flex flex-col sm:flex-row justify-between items-center border-b-2 sm:border-b-4 border-white pb-3 sm:pb-4 mb-4 gap-3 sm:gap-0">
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl uppercase tracking-widest text-center sm:text-left">GOLD RUSH</h1>
      </div>
      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 items-center text-[10px] sm:text-xs md:text-sm">
        <span className="text-gray-400 w-full sm:w-auto text-center">{saveStatus}</span>
        <button onClick={saveGame} className="hover:bg-white hover:text-black px-2 py-1 transition-colors border border-gray-600 sm:border-transparent hover:border-white w-full sm:w-auto">SAVE</button>
        <button onClick={loadGame} className="hover:bg-white hover:text-black px-2 py-1 transition-colors border border-gray-600 sm:border-transparent hover:border-white w-full sm:w-auto">LOAD</button>
      </div>
    </div>
  );

  const renderTitle = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-0 overflow-y-auto space-y-8 sm:space-y-12 py-10">
      <div className="text-center space-y-4 sm:space-y-6">
        <h2 className="text-3xl sm:text-4xl md:text-6xl border-y-2 sm:border-y-4 border-white py-4 sm:py-6 px-4 sm:px-8 uppercase tracking-widest animate-pulse leading-snug">
          GOLD RUSH
        </h2>
        <p className="text-xs sm:text-sm md:text-lg text-gray-300 px-4">A Historical Adventure in 1849 San Francisco</p>
      </div>
      <button 
        onClick={() => setGameState('select')}
        className="text-base sm:text-xl md:text-2xl border-2 border-white px-6 sm:px-8 py-3 sm:py-4 hover:bg-white hover:text-black transition-colors w-[80%] sm:w-auto"
      >
        Press to Start
      </button>
    </div>
  );

  const renderSelect = () => (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto pb-8 h-full min-h-0 overflow-y-auto">
      <p className="text-sm sm:text-lg md:text-xl mb-4 sm:mb-8 leading-loose px-2">Hundreds of thousands of people traveled to California during the Gold Rush. They came from all over the world to build the city of San Francisco.</p>
      <p className="text-sm sm:text-lg md:text-xl mb-2 sm:mb-4 text-yellow-400 px-2">Choose who you will be:</p>
      
      <div className="space-y-3 sm:space-y-4 px-2 sm:pl-8">
        {Object.values(CHARACTERS).map((char, index) => (
          <button
            key={char.id}
            onClick={() => handleSelectCharacter(char.id)}
            className="block w-full text-left text-[10px] sm:text-sm md:text-base p-2 sm:p-3 hover:bg-white hover:text-black transition-colors border border-gray-700 hover:border-white focus:outline-none"
          >
            [ {index + 1} ] {char.title}
          </button>
        ))}
      </div>
    </div>
  );

  const renderWealthRoll = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-0 overflow-y-auto space-y-8 sm:space-y-10 py-10 px-2">
      <p className="text-sm sm:text-lg md:text-xl text-center max-w-2xl leading-loose text-blue-300">
        {CHARACTERS[playerInfo.characterId].journey}
      </p>
      <p className="text-xs sm:text-sm md:text-base text-center text-gray-300 max-w-2xl leading-loose">
        When people arrived in San Francisco, wealth changed everything. Some people had tools and money, while others had absolutely nothing but their skills.
      </p>
      <button 
        onClick={rollWealth}
        className="text-sm sm:text-lg border-2 border-white px-4 sm:px-6 py-3 sm:py-4 hover:bg-white hover:text-black transition-colors animate-pulse w-[80%] sm:w-auto"
      >
        Check your pockets...
      </button>
    </div>
  );

  const renderIntro = () => {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-0 overflow-y-auto space-y-6 sm:space-y-8 py-10 px-2">
        <h3 className="text-xl sm:text-2xl text-yellow-400 uppercase text-center">You are {playerInfo.wealthLevel}</h3>
        <div className="max-w-2xl border-2 border-white p-4 sm:p-6 space-y-4 bg-gray-900 w-full">
          <p className="text-xs sm:text-sm md:text-base leading-loose">{playerInfo.logs[0].text}</p>
          <div className="border-t border-gray-600 pt-4 text-[10px] sm:text-sm space-y-2">
            <p>Starting Money: <span className="text-green-400">${playerInfo.money}</span></p>
            <p>Starting Food: <span className="text-yellow-400">{playerInfo.food} lbs</span></p>
            <p>Starting Supplies: <span className="text-blue-300">{playerInfo.supplies} units</span></p>
          </div>
          <p className="text-[10px] sm:text-sm text-gray-400 mt-4 italic">You have {playerInfo.maxDays} days to build your life in the city.</p>
        </div>
        <button 
          onClick={startLoop}
          className="text-sm sm:text-lg border-2 border-white px-6 sm:px-8 py-3 sm:py-4 hover:bg-white hover:text-black transition-colors w-[80%] sm:w-auto"
        >
          Begin Day 1
        </button>
      </div>
    );
  };

  const renderStoryModal = () => {
    if (!activeStoryEvent) return null;
    return (
      <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
        <div className="max-w-3xl border-4 border-yellow-500 bg-gray-900 p-6 sm:p-10 space-y-8 shadow-[0_0_30px_rgba(234,179,8,0.3)] animate-pulse-slow">
          <h2 className="text-2xl sm:text-4xl text-yellow-400 uppercase tracking-widest text-center border-b-2 border-yellow-700 pb-4">
            {activeStoryEvent.title}
          </h2>
          <p className="text-sm sm:text-lg leading-loose text-white">
            {activeStoryEvent.text}
          </p>
          <p className="text-xs sm:text-sm text-yellow-200 italic border-l-4 border-yellow-600 pl-4 py-2 bg-black/50">
            {activeStoryEvent.rewardText}
          </p>
          <div className="flex justify-center pt-6">
            <button 
              onClick={dismissStoryEvent}
              className="text-lg sm:text-xl border-2 border-yellow-500 px-8 py-4 hover:bg-yellow-500 hover:text-black transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderNpcModal = () => {
    if (!activeNpcEvent) return null;
    return (
      <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
        <div className="max-w-3xl border-4 border-blue-500 bg-gray-900 p-6 sm:p-10 space-y-6 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
          <h2 className="text-xl sm:text-3xl text-blue-400 uppercase tracking-widest text-center border-b-2 border-blue-700 pb-4">
            Encounter: {activeNpcEvent.npc}
          </h2>
          <p className="text-sm sm:text-lg leading-loose text-white text-center">
            {activeNpcEvent.description}
          </p>
          <div className="flex flex-col gap-4 mt-6">
            {activeNpcEvent.choices.map((choice, index) => (
              <button
                key={index}
                onClick={() => handleNpcChoice(choice)}
                className="w-full text-left text-[10px] sm:text-sm p-4 border border-gray-500 hover:border-blue-400 hover:bg-blue-900/50 transition-colors text-white"
              >
                {choice.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderLoop = () => {
    const char = CHARACTERS[playerInfo.characterId];
    const currentHousing = HOUSING_LEVELS[playerInfo.housingIndex];
    const nextHousing = HOUSING_LEVELS[playerInfo.housingIndex + 1];

    const isModalOpen = activeStoryEvent || activeNpcEvent;

    return (
      <div className="flex flex-col h-full flex-1 min-h-0 relative">
        {renderStoryModal()}
        {renderNpcModal()}
        
        {/* Top Status Bar */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4 mb-4 p-2 sm:p-3 border-2 border-white text-[8px] sm:text-[10px] md:text-xs bg-gray-900 overflow-hidden">
          <div className="text-yellow-400 break-words">Day: {playerInfo.day} / {playerInfo.maxDays}</div>
          <div className="text-green-400 break-words">Money: ${playerInfo.money}</div>
          <div className="text-yellow-200 break-words">Food: {playerInfo.food} lbs</div>
          <div className="text-blue-300 break-words">Supplies: {playerInfo.supplies}</div>
          <div className="col-span-2 sm:col-span-1 md:col-span-1 text-pink-300 break-words">Home: {currentHousing.name}</div>
        </div>

        {/* Text Log Console */}
        <div className="flex-1 min-h-0 mb-4 p-2 sm:p-4 border-2 border-gray-700 bg-black relative overflow-hidden flex flex-col">
          <div className="absolute inset-0 scanlines z-0 pointer-events-none"></div>
          <div className="relative z-10 flex-1 overflow-y-auto space-y-3 sm:space-y-4 pr-1 sm:pr-2">
            {playerInfo.logs.map((log, i) => (
              <p key={i} className={`text-[10px] sm:text-xs md:text-sm leading-relaxed sm:leading-loose ${
                log.type === 'action' ? 'text-white' :
                log.type === 'event' ? 'text-blue-300' :
                log.type === 'story' ? 'text-yellow-300 font-bold' :
                log.type === 'warning' ? 'text-red-400 animate-pulse' : 'text-gray-300'
              }`}>
                {log.text}
              </p>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-auto">
          <button disabled={isModalOpen} onClick={handleWork} className="text-left text-[9px] sm:text-xs md:text-sm p-2 sm:p-3 border border-gray-500 hover:bg-white hover:text-black transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed">
            [ 1 ] Work: {char.workNoun} <span className="text-gray-400 text-[8px]">(Takes 1 Day)</span>
          </button>
          <button disabled={isModalOpen} onClick={handleBuyFood} className="text-left text-[9px] sm:text-xs md:text-sm p-2 sm:p-3 border border-green-600 hover:bg-green-400 hover:text-black transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed">
            [ 2 ] Quick Trade: Buy {char.foodName} ($5)
          </button>
          <button disabled={isModalOpen} onClick={handleBuySupplies} className="text-left text-[9px] sm:text-xs md:text-sm p-2 sm:p-3 border border-green-600 hover:bg-green-400 hover:text-black transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed">
            [ 3 ] Quick Trade: Buy Supplies ($10)
          </button>
          
          {nextHousing ? (
            <button disabled={isModalOpen} onClick={handleUpgradeHousing} className="text-left text-[9px] sm:text-xs md:text-sm p-2 sm:p-3 border border-yellow-600 hover:bg-yellow-400 hover:text-black transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed">
              [ 4 ] Build {nextHousing.name} <span className="text-gray-400 text-[8px]">(Takes 1 Day)</span>
            </button>
          ) : (
            <button disabled className="text-left text-[9px] sm:text-xs md:text-sm p-2 sm:p-3 border border-gray-800 text-gray-600 cursor-not-allowed w-full">
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
      <div className="flex flex-col h-full min-h-0 overflow-y-auto items-center justify-center space-y-4 sm:space-y-6 text-center max-w-3xl mx-auto pb-10 px-2">
        <h2 className="text-2xl sm:text-3xl md:text-5xl text-yellow-400 mb-2 mt-4 sm:mt-8">Time is up!</h2>
        
        <div className="p-4 sm:p-6 border-2 sm:border-4 border-white space-y-4 sm:space-y-6 bg-gray-900 w-full text-left">
          <p className="text-sm sm:text-lg md:text-xl text-center text-blue-300 uppercase tracking-widest mb-4 sm:mb-6">
            Your Life in 1849
          </p>
          
          <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm md:text-base leading-relaxed sm:leading-loose">
            <p>You arrived as a <span className="text-yellow-300">{char.title}</span>.</p>
            <p>{scorePhrase}</p>
            <p className="border-l-2 sm:border-l-4 border-yellow-500 pl-3 sm:pl-4 text-gray-300 italic">{char.tips}</p>
          </div>

          <div className="border-t border-gray-600 pt-4 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-[10px] sm:text-sm">
            <div>Final Money: <span className="text-green-400">${playerInfo.money}</span></div>
            <div>Final Food: <span className="text-yellow-400">{playerInfo.food} lbs</span></div>
            <div>Final Supplies: <span className="text-blue-300">{playerInfo.supplies}</span></div>
            <div className="sm:col-span-2">Final Home: <span className="text-pink-300">{finalHousing.name}</span></div>
          </div>
        </div>

        <button 
          onClick={resetGame}
          className="text-sm sm:text-lg border-2 border-white px-6 sm:px-8 py-3 sm:py-4 hover:bg-white hover:text-black transition-colors mt-4 sm:mt-6 w-[80%] sm:w-auto"
        >
          Play Again
        </button>
      </div>
    );
  };

  return (
    <>
      <style>{PIXEL_FONT}</style>
      <div className="h-[100dvh] w-full bg-black text-white font-pixel p-1 sm:p-4 md:p-8 selection:bg-white selection:text-black flex flex-col">
        <div className="max-w-5xl mx-auto border-2 sm:border-4 md:border-8 border-gray-800 rounded-lg sm:rounded-3xl p-1 sm:p-2 md:p-4 bg-gray-900 shadow-[0_0_20px_rgba(0,0,0,0.8)] sm:shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full flex-1 flex flex-col min-h-0">
          <div className="flex-1 rounded-md sm:rounded-xl border border-gray-700 bg-black p-2 sm:p-4 md:p-6 flex flex-col relative overflow-hidden min-h-0">
            
            {gameState !== 'title' && renderHeader()}
            
            <div className="flex-1 flex flex-col z-10 relative min-h-0">
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
