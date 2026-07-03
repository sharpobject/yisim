using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Org.Xresloader.Pb;
using Proto;
using wProtobuf;

public static class DumpCardConfig
{
    public static void Main(string[] args)
    {
        if (args.Length != 2)
        {
            Console.Error.WriteLine("usage: DumpCardConfig <CardConfig.pb> <output.json>");
            Environment.Exit(2);
        }

        byte[] bytes = File.ReadAllBytes(args[0]);
        var cards = new List<CardConfig>();
        byte[] trimmed = bytes;
        if (bytes.Length > 2 && bytes[0] == 10 && bytes[1] == 3)
        {
            trimmed = new byte[bytes.Length - 2];
            Array.Copy(bytes, 2, trimmed, 0, trimmed.Length);
        }
        var stream = new MessageStream(trimmed.Length);
        stream.Write(trimmed);
        stream.ReadPos = 0;
        var blocks = new xresloader_datablocks();
        blocks.MergeFrom(stream);
        foreach (ByteString block in blocks.data_block)
        {
            var cardStream = new MessageStream(block.Length + 8);
            cardStream.WriteBytes(block);
            cardStream.ReadPos = 0;
            var card = new CardConfig();
            cardStream.ReadMessage(card);
            cards.Add(card);
        }

        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(args[1]))!);
        File.WriteAllText(args[1], ToJson(cards));
    }

    private static string ToJson(List<CardConfig> cards)
    {
        var sb = new StringBuilder();
        sb.Append("[\n");
        for (int i = 0; i < cards.Count; i++)
        {
            CardConfig card = cards[i];
            if (i > 0)
            {
                sb.Append(",\n");
            }
            sb.Append("  {");
            Add(sb, "id", card.id);
            Add(sb, "name", card.name);
            Add(sb, "desc", card.desc);
            Add(sb, "sect", (int)card.sect);
            Add(sb, "career", (int)card.career);
            Add(sb, "level", (int)card.level);
            Add(sb, "anima", card.anima);
            Add(sb, "attack", card.attack);
            Add(sb, "attackCount", card.attackCount);
            Add(sb, "def", card.def);
            Add(sb, "damage", card.damage);
            Add(sb, "actionAgain", card.actionAgain);
            Add(sb, "cardType", (int)card.cardType);
            Add(sb, "rarity", card.rarity);
            Add(sb, "hpCost", card.hpCost);
            Add(sb, "physique", card.physique);
            Add(sb, "linkageId", card.linkageId);
            Add(sb, "chargeQi", card.chargeQi);
            Add(sb, "overrideSpriteId", card.overrideSpriteId);
            Add(sb, "subcategory", (int)card.subcategory);
            Add(sb, "owner", card.owner);
            Add(sb, "hidden", card.hidden);
            AddArray(sb, "otherParams", card.otherParams);
            AddArray(sb, "seasonMechanics", card.seasonMechanics);
            Add(sb, "obsolete", card.obsolete, last: true);
            sb.Append(" }");
        }
        sb.Append("\n]\n");
        return sb.ToString();
    }

    private static void Add(StringBuilder sb, string name, int value, bool last = false)
    {
        sb.Append('"').Append(name).Append("\":").Append(value);
        if (!last) sb.Append(',');
    }

    private static void Add(StringBuilder sb, string name, bool value, bool last = false)
    {
        sb.Append('"').Append(name).Append("\":").Append(value ? "true" : "false");
        if (!last) sb.Append(',');
    }

    private static void Add(StringBuilder sb, string name, string value, bool last = false)
    {
        sb.Append('"').Append(name).Append("\":\"").Append(Escape(value ?? "")).Append('"');
        if (!last) sb.Append(',');
    }

    private static void AddArray(StringBuilder sb, string name, List<int> values, bool last = false)
    {
        sb.Append('"').Append(name).Append("\":[");
        for (int i = 0; i < values.Count; i++)
        {
            if (i > 0) sb.Append(',');
            sb.Append(values[i]);
        }
        sb.Append(']');
        if (!last) sb.Append(',');
    }

    private static string Escape(string value)
    {
        return value
            .Replace("\\", "\\\\")
            .Replace("\"", "\\\"")
            .Replace("\n", "\\n")
            .Replace("\r", "\\r")
            .Replace("\t", "\\t");
    }
}
