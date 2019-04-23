const fetch = require("node-fetch");

const discordUrls = {
    YYGPC9: process.env.DISCORD_URL_NOR,
    L2YC2VY: process.env.DISCORD_URL_NOR2,
    "229GLQJV": process.env.DISCORD_URL_NOR3,
};
exports.handler = async (event, context, callback) => {
    if (event.Records && Array.isArray(event.Records)) {
        for (let record of event.Records) {
            if (record.eventName === "INSERT") {
                const tag = record.dynamodb.NewImage.tag.S;
                const clan = record.dynamodb.NewImage.clan.S;
                let player = await fetch("https://api.royaleapi.com/player/" + tag, {
                    headers: {
                        auth: process.env.ROYALE_API_KEY,
                    },
                });
                player = await player.json();
                const profileUrl = await shortenUrl("https://royaleapi.com/player/" + tag);
                const readiness = calculateWarReadiness(player);
                await sendDiscordMessage(
                    clan,
                    `👋 ${player.name}. Throphies: ${player.trophies}/${player.stats.maxTrophies}, ${
                        player.games.warDayWins
                    } war day wins, ${player.stats.challengeMaxWins} max wins in challenges and level ${
                        player.stats.level
                    } towers. The player got ${readiness.legendary}% legendary cards, ${readiness.gold}% gold cards, ${
                        readiness.silver
                    }% silver cards and ${readiness.bronze}% bronze cards. Profile: <${profileUrl}>`
                );
            } else if (record.eventName === "REMOVE") {
                const name = record.dynamodb.OldImage.name.S;
                const clan = record.dynamodb.OldImage.clan.S;
                await sendDiscordMessage(clan, `${name} left the clan. 😔`);
            }
        }
    }
};
const shortenUrl = async deckUrl => {
    const urlEncoded = encodeURIComponent(deckUrl);
    const response = await fetch(`https://is.gd/create.php?format=simple&url=${urlEncoded}`, {
        method: "GET",
    });
    return await response.text();
};

const sendDiscordMessage = (clan, message) => {
    return fetch(discordUrls[clan], {
        method: "POST",
        body: JSON.stringify({ content: message }),
        headers: { "Content-Type": "application/json" },
    });
};

const calculateWarReadiness = player => {
    const userCards = player.cards;
    const percent = {
        legendary: 0,
        gold: 0,
        silver: 0,
        bronze: 0,
    };

    for (let j = 0; j < userCards.length; j++) {
        const card = userCards[j];
        const levelDiff = card.maxLevel - card.displayLevel;
        switch (levelDiff) {
            case 0:
            case 1:
                percent.legendary++;
            case 2:
                percent.gold++;
            case 3:
                percent.silver++;
            case 4:
                percent.bronze++;
        }
    }

    const retur = {
        legendary: (percent.legendary / 92.0 * 100).toFixed(0),
        gold: (percent.gold / 92.0 * 100).toFixed(0),
        silver: (percent.silver / 92.0 * 100).toFixed(0),
        bronze: (percent.bronze / 92.0 * 100).toFixed(0),
    };

    return retur;
};
