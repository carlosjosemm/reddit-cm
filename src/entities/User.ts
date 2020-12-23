// import { Entity, PrimaryKey, Property } from "@mikro-orm/core";
import { Field, ObjectType } from "type-graphql";
import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

//MIKRO-ORM SETTING IS COMMENTED OUT
@ObjectType()
@Entity()
export class User extends BaseEntity {
    @Field()
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
  // @Property({type: "text", unique: true})
  @Column({type: "text", unique: true})
  username!: string;


  @Field()
  // @Property({type: "text", unique: true})
  @Column({type: "text", unique: true})

  email!: string;

  // @Property({type: "text"})
  @Column()
  password!: string;
}