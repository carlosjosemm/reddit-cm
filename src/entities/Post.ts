// import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { Field, Int, ObjectType } from "type-graphql";
import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@ObjectType()
@Entity()
export class Post extends BaseEntity{
    @Field(() => Int)
  // @PrimaryKey()
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(() => String)
  // @Property({type: "date"})
  @CreateDateColumn()
  createdAt = Date();

  @Field(() => String)
  // @Property({ type: "date", onUpdate: () => new Date() })
  @UpdateDateColumn()
  updatedAt = Date();

  @Field()
  // @Property({type: "text"})
  @Column({type: "text"})
  title!: string;
}
