import { DatabaseRepository, Lean } from "./database.repository";
import { IChat as TDocument } from "../model/Chat.model";
import {
  HydratedDocument,
  Model,
  PopulateOptions,
  ProjectionType,
  QueryOptions,
  RootFilterQuery,
} from "mongoose";

export class ChatRepository extends DatabaseRepository<TDocument> {
  constructor(protected override readonly model: Model<TDocument>) {
    super(model);
  }

  async findOneChat({
    filter,
    select,
    options,
    page = 1,
    size = 5,
  }: {
    filter?: RootFilterQuery<TDocument>;
    select?: ProjectionType<TDocument> | null;
    options?: QueryOptions<TDocument> | null;
    page?: number;
    size?: number;
  }): Promise<HydratedDocument<TDocument> | null | Lean<TDocument>> {
    page = Math.floor(page && page > 0 ? page : 1);
    size = Math.floor(size && size > 0 ? size : 5);

    const doc = this.model.findOne(filter, {
      messages: { $slice: [-(page * size), size] },
    });

    if (options?.lean) doc.lean(options.lean);
    if (options?.populate) doc.populate(options.populate as PopulateOptions[]);
    if (options?.limit) doc.limit(options.limit);
    if (options?.skip) doc.skip(options.skip);

    return await doc.exec();
  }
}
