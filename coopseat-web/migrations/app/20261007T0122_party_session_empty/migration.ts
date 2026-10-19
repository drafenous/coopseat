#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4a3af9354269f6a831ce48b36c1970ffa80fd99930f25c981323001749df2360/contract';
import endContract from '../../snapshots/4a3af9354269f6a831ce48b36c1970ffa80fd99930f25c981323001749df2360/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/865c0af292ccb63258648dfec3b64677416f9f1c782cac36464cb735724f6435/contract';
import startContract from '../../snapshots/865c0af292ccb63258648dfec3b64677416f9f1c782cac36464cb735724f6435/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'party_sessions',
        constraint: 'party_sessions_end_reason_56813f84',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'party_sessions',
        constraint: 'party_sessions_end_reason_322d0e7e',
        expression:
          "\"endReason\" IS NULL OR \"endReason\" IN ('owner_ended', 'owner_timeout', 'empty', 'max_duration', 'sanction', 'operator')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
