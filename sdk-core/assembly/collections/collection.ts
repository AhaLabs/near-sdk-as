import { collections } from ".";
import { Storage } from "..";

/**
 * Top level Collection class.
 */
export abstract class Collection {

  
  constructor(protected storage: Storage = Storage.cachingStorage) {}



}

export abstract class PrefixedCollection<K> extends Collection {
  get _elementPrefix(): string {
    return this.prefix + collections._KEY_ELEMENT_SUFFIX;
  }

  constructor(protected prefix: string, storage: Storage = Storage.cachingStorage){
    super(storage);
  }

  /**
   * @returns An internal string key for a given key of type K.
   */
  protected _key(key: K): string {
    // @ts-ignore: TODO: Add interface that forces all K types to have toString
    return this._elementPrefix + key.toString();
  }
}