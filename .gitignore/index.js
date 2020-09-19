const fs = require('fs');
const Discord = require('discord.js');
const { prefix, token } = require('./config.json');

const client = new Discord.Client();
client.commands = new Discord.Collection();
const cooldowns = new Discord.Collection();

client.login(token);

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

// *************************************************************************************
// Code Arrivé/Départ de joueur

// Arrivé d'un joueur
client.on("guildMemberAdd", user => {
    // const member = user.mentions.members;
    const role = user.guild.roles.cache.find(role => role.name === 'Membre');
    let joinEmbed = new Discord.MessageEmbed()
        .setColor("#33ff00")
        .setAuthor(user.user.username, user.user.displayAvatarURL)
        .setDescription("Bienvenue **" + user.user.username + "** sur le serveur **" + user.guild.name + "** !")
        .setFooter("Les Tocars | TocaRobot")
    user.send("Bienvenue **" + user.user.username + "** sur le serveur **" + user.guild.name + "** !\nUn bot est à ta disposition, fait /help dans le salon nomée Command Bot \n(pas encore finis pour le moment, une annonce sera fait dans un salon lorsque la mise en place du bot sera terminer)")
    client.channels.cache.get("238614487685398529").send(joinEmbed);
    user.roles.add(role);
});
// Départ d'un joueur
client.on("guildMemberRemove", user => {

    let leaveEmbed = new Discord.MessageEmbed()
        .setColor("#33ff00")
        .setAuthor(user.user.username, user.user.displayAvatarURL)
        .setDescription("Sniff **" + user.user.username + "** à quitté le serveur :cry:")
        .setFooter("Les Tocars | TocaRobot")
    user.send("Aurevoir **" + user.user.username + "** et à bientôt sur le serveur **" + user.guild.name + "** !")
    client.channels.cache.get("238614487685398529").send(leaveEmbed)
});

// ******************************************************************************
// Commande général
client.on("message", message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    const args = message.content.slice(prefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName)
        || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    if (!command) return;

    // On vérifie si on veut des arguments où non -----------------------
    if (command.args && !args.length) {
        let reply = `Vous n'avez pas fourni d'argument, ${message.author}!`;
        if (command.usage) {
            reply += `\nLa commande doit être écrit de cette manière: \`${prefix}${command.name} ${command.usage}\``;
        }
        return message.channel.send(reply);
    }

    // On vérifie si le message est dans les dm où sur le serveur -----
    if (command.guildOnly && message.channel.type !== 'text') {
        return message.reply("Je ne peut pas éxécuter cette commande dans les messages privées");
    }

    // Cooldown -------------------------------------------------------
    if (!cooldowns.has(command.name)) {
        cooldowns.set(command.name, new Discord.Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return message.reply(`Veuillez attendre ${timeLeft.toFixed(1)} seconde(s) avant de réutiliser la commande \`${command.name}\`.`);
        }
        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
    }

    // On vérifie si la personne à le role pour utiliser la commande -----------------------------------
    if (command.role === 'staff') {
        if (!message.member.roles.cache.has('696517856300498984')) {
            return message.channel.send(`:x:  | **${message.author}**, vous n'avez pas le grade nécessaire pour utiliser cette commande |  :x:`);
        }
    }

    // On vérifie que la commande n'est pas utiliser sur un membre du staff
    if (command.protect === 'Staff') {
        const member = message.mentions.members.first();
        if(member.roles.cache.some(role => role.name === "Staff")){
            return message.channel.send(`:x:  | ${message.author}, les commandes de modérations ne doivent pas etre utiliser sur les membres du staff !!! |  :x:`)
        }
    }

    // Execution commande --------------------------------------------
    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply("Il y'a eu une erreur lors de l'éxécution de cette commande!");
    }
});
