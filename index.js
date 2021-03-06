require('dotenv').config();
const http = require('http')
const axios = require('axios');
const Database = require('@replit/database');
const schedule = require('node-schedule');

// Require the necessary discord.js classes
const { Client, Intents, MessageEmbed } = require('discord.js');
const token = process.env.TOKEN;
const { joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  entersState,
  StreamType,
  AudioPlayerStatus,
  VoiceConnectionStatus, } = require('@discordjs/voice');
// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const db = new Database();

client.on("debug", (e) => console.log(e));
const AUTH = process.env.HUGGINGFACE_AUTH;

const config = {
  method: 'post',
  url: 'https://api-inference.huggingface.co/models/facebook/blenderbot-400M-distill',
  headers: { Authorization: AUTH }
};

const setBirthdayJobs = async () => {
  const birthdayKeys = await db.list();
  const birthdays = await Promise.all(birthdayKeys.map(async (key) => {
    const birthday = await db.get(key);
    return { user: key, birthday: birthday };
  }));

  await schedule.gracefulShutdown();

  birthdays.forEach(async (i) => {
    let { user, birthday } = i;
    birthday = birthday.split('/');
    const day = parseInt(birthday[0]);
    const month = parseInt(birthday[1]);
    console.log(day, month);

    var bdChannelId = '919084150428954647';
    var bdRule = new schedule.RecurrenceRule();

    bdRule.tz = 'Asia/Jakarta';
    bdRule.date = day;
    bdRule.month = month - 1;
    bdRule.hour = 12;
    bdRule.minute = 34;
    // bdRule.second = [...Array(60).keys()];

    const bdJob = schedule.scheduleJob(bdRule, () => {
      client.channels
        .fetch(bdChannelId)
        .then((channel) => {
          channel.send(
            `Happy birthday, <@${user}>!!! :tada::tada::tada::tada:`
          );
        })
        .catch((err) => {
          console.log(err);
        });
    });
  });
}

client.once('ready', async () => {
  await setBirthdayJobs();
  console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    await interaction.reply('Pong!');
  } else if (commandName === 'server') {
    await interaction.reply(`Server name: ${interaction.guild.name}\nTotal members: ${interaction.guild.memberCount}`);
  } else if (commandName === 'user') {
    await interaction.reply(`Your tag: ${interaction.user.tag}\nYour id: ${interaction.user.id}`);
  }
});

async function connectToChannel(channel) {
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30e3);
    return connection;
  } catch (error) {
    connection.destroy();
    throw error;
  }
}

async function quantumRandom() {
  const config = {
    method: 'get',
    url: 'https://qrng.anu.edu.au/API/jsonI.php?length=1&type=uint8&size=1'
  }

  const response = await axios(config);
  console.log(200);
  console.log(response.data);
  return response.data.data[0] <= 127;
}


client.on('messageCreate', async message => {
  if (message.content.startsWith('!mock')) {
    const mocked = message.content.slice(5).split('').map((i, a) => Math.random() > 0.5 ? i.toLowerCase() : i.toUpperCase()).join('')
    const embed = new MessageEmbed()
      .setTitle(mocked)
      .setImage('https://imgflip.com/s/meme/Mocking-Spongebob.jpg')
    message.channel.send({ embeds: [embed] })
    message.delete()

  } else if (message.content.startsWith('!echo')) {
    message.channel.send(message.content.slice(5))
    message.delete()
  } else if (message.content.startsWith('!marahin')) {
    mention = message.mentions.members.first()
    if (mention !== undefined) {
      message.channel.send('Kak ' + mention.toString() + ', belajar sana :rage::rage:!!')
    }
  } else if (message.content.startsWith('!semangat')) {
    mention = message.mentions.members.first()
    if (mention !== undefined) {
      message.channel.send('Semangat, Kak ' + mention.toString() + '!!')
      message.delete()
    }
  } else if (message.content.startsWith('!bodoh')) {
    mention = message.mentions.members.first()
    if (mention !== undefined) {
      message.channel.send('Iya, emang. Jangan dilakuin lagi, ' + mention.toString() + '!!')
    }
  } else if (message.content.startsWith('-summon')) {
    const channel = message.member?.voice.channel;

    if (channel) {
      try {
        const connection = await connectToChannel(channel);

        message.reply('Playing now!');
      } catch (error) {
        console.error(error);
      }
    } else {
      message.reply('Join a voice channel then try again!');
    }
  } else if (/s+t+r+e+s+/gi.test(message.content)) {
    message.channel.send('Semangat, Kak ' + message.author.toString() + '!')
  } else if (/b+o+d+o+h+/gi.test(message.content)) {
    message.channel.send('Iya, emang. Jangan dilakuin lagi, ' + message.author.toString() + '!!')
  } else if (/(?:atip, mending )(.+)(?: atau )(.+)/gi.test(message.content)) {
    let matches = message.content.matchAll(/(?:atip, mending )(.+)(?: atau )(.+)(?:\??)/gi)
    matches = [...matches]
    const rand = await quantumRandom();
    console.log(rand);
    const mending = rand ? matches[0][1] : matches[0][2]
    message.channel.send('Mendingan ' + mending)
  } else if (/(?:atip, should I )(.+)(?: or )(.+)\?/gi.test(message.content)) {
    let matches = message.content.matchAll(/(?:atip, should I )(.+)(?: or )(.+)\?/gi)
    matches = [...matches]
    const rand = await quantumRandom();
    const mending = rand ? [matches[0][1], matches[0][2]] : [matches[0][2], matches[0][1]]
    const out = "You should " + mending[0];
    const query = JSON.stringify({
      inputs: {
        past_user_inputs: [message.content],
        generated_responses: [out],
        text: "Why should I " + mending[0] + "?"
      }
    })
    console.log(query)
    message.channel.sendTyping()
    axios({ ...config, data: query })
      .then(response => {
        console.log('200')
        console.log(response.data)
        message.channel.send(out + '.' + response.data.generated_text);
      })
      .catch(err => {
        console.log(err.response.status)
        console.log(err.response.data)
        message.channel.send('Error ocurred, please try again')
      })
  } else if (message.content.startsWith('!conv')) {
    const query = JSON.stringify({
      inputs: {
        past_user_inputs: ["Hello!"],
        generated_responses: ["Hello, my name is Atip. How can I help you with?"],
        text: message.content.slice(5)
      },
      parameters: {
        top_p: 0.9,
        temperature: 1.1
      }
    })
    message.channel.sendTyping()
    axios({ ...config, data: query })
      .then(response => {
        console.log(response.data)
        message.channel.send(response.data.generated_text.trim());
      })
      .catch(console.err)
  } else if (message.content.startsWith('!addbirthday')) {
    // parse the birthday
    const mention = message.mentions.members.first()

    if (mention === undefined) {
      message.channel.send('Please mention a user to add their birthday')
      return
    }

    const birthday = message.content.split(' ').slice(2).join(' ').split('/')

    if (birthday.length !== 2) {
      message.channel.send('Please specify the birthday')
      return
    }

    const day = birthday[0]
    const month = birthday[1]

    // check if the birthday is valid using the Date API
    const date = new Date(month + '/' + day + '/' + new Date().getFullYear())
    if (date.getMonth() !== parseInt(month) - 1 || date.getDate() !== parseInt(day)) {
      message.channel.send('Please specify a valid birthday')
      return
    }

    // add the birthday to the database
    await db.set(mention.id, `${day}/${month}`)

    // get from db
    const bday = await db.get(mention.id);

    message.channel.send('Birthday ' + mention.toString() + ' added!' + '\n' + 'Birthday: ' + bday)
    setBirthdayJobs();
  }
})

// Login to Discord with your client's token
client.login(token);
console.log('login')
const requestListener = function (req, res) {
  res.writeHead(200);
  res.end("My first server!");
};
const server = http.createServer(requestListener);
server.listen(80, '0.0.0.0', () => {
  console.log(`Server is running on http://`);
});
