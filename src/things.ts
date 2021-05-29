import { MessageEmbed } from "discord.js";
import { decode } from "html-entities";
import { KOLClient } from "./kolclient";

export abstract class Thing {
    abstract name(): string;
    abstract addToEmbed(embed: MessageEmbed, client: KOLClient): void;
}

type ItemData = {
    id: number,
    name: string,
    descId: number,
    imageUrl: string,
    types: string,
    quest: boolean,
    gift: boolean,
    tradeable: boolean,
    discardable: boolean,
    autosell: number,
    pluralName: string,
}

export class Item implements Thing {
    _item: ItemData;
    _name: string;

    constructor(data: string) {
        this._item = this.parseItemData(data);
        this._name = this._item.name.toLowerCase();
    }

    get(): ItemData {
        return this._item;
    }

    name(): string {
        return this._name;
    }

    async addToEmbed(embed: MessageEmbed, client: KOLClient): Promise<void> {
        embed.setThumbnail(`http://images.kingdomofloathing.com/itemimages/${this._item.imageUrl}`);
        let description_string = "";
        if (this._item.quest) description_string += "Quest Item\n";
        else if (this._item.gift) description_string += "Gift Item\n";
        if (!this._item.tradeable) {
            if (this._item.discardable) description_string += "Cannot be traded.\n\n";
            else description_string += "Cannot be traded or discarded.\n\n";
        }
        else if (!this._item.discardable) description_string += "Cannot be discarded.\n\n";

        const blueText = await client.getItemDescription(this._item.descId);  
        if (blueText) description_string += `${blueText}\n`;

        if (this._item.discardable && this._item.autosell > 0) {
            description_string += `Autosell value: ${this._item.autosell} meat.\n`;
        }
        if (this._item.tradeable) {
            const {mallPrice, limitedMallPrice} = await client.getMallPrice(this._item.id);
            if (mallPrice) {            
                description_string += `Mall Price: ${mallPrice} meat`;
                if (limitedMallPrice) description_string += ` (or ${limitedMallPrice} meat limited per day)`
            }
            else if (limitedMallPrice) description_string += `Mall Price: ${mallPrice} meat (only available limited per day)`;
            else description_string += "Mall extinct."
        }
        embed.setDescription(description_string);
    }
    
    parseItemData(itemData: string): ItemData {
        const data = itemData.split(/\t/);
        if (data.length < 7) throw "Invalid data"
        return {
            id: parseInt(data[0]),
            name: decode(data[1]),
            descId: parseInt(data[2]),
            imageUrl: data[3],
            types: data[4],
            quest: data[5].indexOf("q") >= 0,
            gift: data[5].indexOf("g") >= 0,
            tradeable: data[5].indexOf("t") >= 0,
            discardable: data[5].indexOf("d") >= 0,
            autosell: parseInt(data[6]),
            pluralName: data[7] || `${data[1]}s`,
        }
    }
}

type EffectData = {
    id: number,
    name: string,
    imageUrl: string,
    descId: string,
    quality: string,
    attributes: string,
}

export class Effect implements Thing {
    _effect: EffectData;
    _name: string;

    constructor(data: string) {
        this._effect = this.parseEffectData(data);
        this._name = this._effect.name.toLowerCase();
    }

    get(): EffectData {
        return this._effect;
    }

    name(): string {
        return this._name;
    }

    async addToEmbed(embed: MessageEmbed, client: KOLClient): Promise<void> {
        embed.setThumbnail(`http://images.kingdomofloathing.com/itemimages/${this._effect.imageUrl}`);
        embed.setDescription(`**Effect**\n${await client.getEffectDescription(this._effect.descId)}`);
    }
    
    parseEffectData(effectData: string): EffectData {
        const data = effectData.split(/\t/);
        if (data.length < 6) throw "Invalid data"
        return {
            id: parseInt(data[0]),
            name: decode(data[1]),
            imageUrl: data[2],
            descId: data[3],
            quality: data[4],
            attributes: data[5],
        }
    }
}

type SkillData = {
    id: number,
    name: string,
    imageUrl: string,
    type: string,
    manaCost: number,
    duration: number,
    level?: number,
}

export class Skill implements Thing {
    _skill: SkillData;
    _name: string;

    constructor(data: string) {
        this._skill = this.parseSkillData(data);
        this._name = this._skill.name.toLowerCase();
    }

    get(): SkillData {
        return this._skill;
    }

    name(): string {
        return this._name;
    }

    async addToEmbed(embed: MessageEmbed, client: KOLClient): Promise<void> {
        embed.setThumbnail(`http://images.kingdomofloathing.com/itemimages/${this._skill.imageUrl}`);
        switch (this._skill.id) {
            default: embed.setDescription(await client.getSkillDescription(this._skill.id));
        }
    }
    
    parseSkillData(skillData: string): SkillData {
        const data = skillData.split(/\t/);
        if (data.length < 6) throw "Invalid data"
        return {
            id: parseInt(data[0]),
            name: decode(data[1]),
            imageUrl: data[2],
            type: data[3],
            manaCost: parseInt(data[4]),
            duration: parseInt(data[5]),
            level: data[6] ?  parseInt(data[6]) : undefined,
        }
    }
}

type FamiliarData = {
    id: number,
    name: string,
    imageUrl: string,
    type: string,
    larva: string,
    item: string,
    attributes: string,
}

export class Familiar implements Thing {
    _familiar: FamiliarData;
    _name: string;

    constructor(data: string) {
        this._familiar = this.parseFamiliarData(data);
        this._name = this._familiar.name.toLowerCase();
    }

    get(): FamiliarData {
        return this._familiar;
    }

    name(): string {
        return this._name;
    }

    async addToEmbed(embed: MessageEmbed, client: KOLClient): Promise<void> {
        embed.setThumbnail(`http://images.kingdomofloathing.com/itemimages/${this._familiar.imageUrl}`);
        let description_string = "**Familiar**\n"
        description_string += `Hatchling: ${this._familiar.larva}\n${this._familiar.item ? `Equipment: ${this._familiar.item}\n` : ""}Attributes: ${this._familiar.attributes || "None"}`;
        embed.setDescription(description_string);
    }
    
    parseFamiliarData(familiarData: string): FamiliarData {
        const data = familiarData.split(/\t/);
        if (data.length < 10) throw "Invalid data"
        return {
            id: parseInt(data[0]),
            name: decode(data[1]),
            imageUrl: data[2],
            type: data[3],
            larva: data[4],
            item: data[5],
            attributes: data[10]? data[10].replace(/,/g, ", ") : "",
        }
    }
}