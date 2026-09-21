# DATA_MODEL — RPG

Todas as entidades persistentes usam **ID estável e prefixado**. Nome nunca é
chave primária (`src/core/ids/ids.ts`).

```
kingdom_<12hex>   region_<12hex>   location_<12hex>   npc_<12hex>
event_<12hex>     quest_<12hex>    item_<12hex>       dungeon_<12hex>
faction_<12hex>   memory_<12hex>   rumor_<12hex>      chronicle_<12hex>
creature_<12hex>  save_<12hex>
```

## Player

```ts
Player {
  id, name, gender, originId, classId, level, xp, xpToNext,
  attributePoints, skillPoints,
  attributes: { strength, vitality, intelligence, wisdom, dexterity, agility, luck },
  resources: { hp, maxHp, mana, maxMana },
  equipment: Record<EquipmentSlot, ItemId | null>,
  inventory: InventoryEntry[],
  skills: Record<SkillId, rank>,
  gold, currentLocationId, discoveredLocationIds[], reputation, createdAt
}
```

`DerivedStats` nunca é persistido: é recalculado por `computeDerivedStats(player, items)`
em `src/domain/player/stats.ts`. Fonte única de verdade para balanceamento.

## Item

```ts
ItemBase   { baseId, name, category, slot, tier, baseValue, baseStats, tags[] }
Item       { id, baseId, name, rarity, itemLevel, material, quality,
             prefix, suffix, affixes: Affix[], stats, value, special?, lore?,
             uniqueName?, previousOwnerNpcId?, originEventId? }
Affix      { id, label, stat, value, kind: 'prefix'|'suffix'|'implicit' }
```

Item procedural = `Base + Material + Quality + Prefix + Suffix + Affixes + Special + Rarity`.

## NPC

```ts
NPC {
  id, seed, name, surname, age, gender, archetypeId, occupationId,
  homeLocationId, currentLocationId, factionId | null,
  personalityTraits[], motivations[], fears[],
  wealth, inventoryItemIds[], alive, deathEventId?,
  scheduleId, secrets[], knowledgeIds[], dialogueState,
  importance: 'minor'|'notable'|'major'
}
```

Relacionamentos, memórias e conhecimento vivem em tabelas próprias indexadas por
`npcId` — não aninhados no NPC — para permitir poda e LOD.

## Mundo

```
World { seed, seedLabel, createdAt, gameDay, gameYear, kingdomIds[] }
Kingdom  { id, name, rulerNpcId, capitalLocationId, regionIds[], factionIds[] }
Region   { id, kingdomId, name, biome, levelRange, locationIds[],
           dangerLevel, resources[], creatureFamilies[], loreSeed, discovered }
Location { id, regionId, kind: city|village|wilderness|dungeon|poi,
           name, levelRange, discovered, artKey, establishments[], npcIds[] }
LocationState { locationId, prosperity, danger, population, factionControl,
                discovered, destroyed, activeProblems[], historicalEventIds[] }
FactionState  { factionId, reputationWithPlayer, resources, influence,
                enemyIds[], allyIds[], territoryIds[], importantEventIds[] }
```

## Memória e narrativa

```
WorldEvent    { id, timestamp, gameDay, type, locationId, regionId, kingdomId,
                participantIds[], witnessIds[], cause, consequences[],
                importance, tags[], summary }
NPCMemory     { id, npcId, eventId, subjectId, memoryType, emotionalWeight,
                trustImpact, fearImpact, respectImpact, importance,
                createdAt, lastRecalledAt, decayRate, permanent, tier }
NPCRelationship { npcId, targetId, affinity, trust, fear, respect,
                  gratitude, hostility, familiarity }
Rumor         { id, sourceEventId, text, truthfulness, distortion, gameDay,
                knownByNpcIds[], regionId, topic }
ChronicleEntry{ id, gameYear, gameDay, title, text, eventId, importance }
```

`tier` da memória: `immediate | relevant | permanent | summarized` (ver MEMORY_SYSTEM.md).

## Quest

```
Quest { id, title, template, actorNpcId, motivation, problem, locationId,
        targetId, complication, consequence, objectives: Objective[],
        rewards, state: offered|active|completed|failed|expired,
        fingerprint, createdDay, expiresDay?, worldContextSummary }
Objective { id, kind, targetRef, required, current, done, optional }
```

`fingerprint` é o hash semântico usado pelo anti-repetição.

## Combate

```
Combatant { id, side, name, level, stats, resources, statuses[], skillIds[],
            aiProfile?, artKey }
CombatState { id, seed, turn, order[], combatants, log[], rewards?, outcome }
StatusEffect { id, kind, magnitude, remainingTurns, sourceId }
```

## Save

```
SaveEnvelope<T> { schemaVersion, checksum, updatedAt, data: T }
SaveIndex { slots: SaveSlotMeta[] , activeSlotId }
```

Partes gravadas independentemente: `meta, player, world, npcs, memories, quests,
chronicle, factions, economy, dungeons`.
