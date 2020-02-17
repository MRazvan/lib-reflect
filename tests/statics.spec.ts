// eslint-disable-next-line
/// <reference path="../src/defines.d.ts" />
import { expect } from "chai";
import { MethodFlags, PropertyFlags, ReflectHelper } from "../index";


describe('ReflectHelper', () => {
   it('Should add static methods', () => {
      class TestClass {
         public static method (y: any, z: any, t: any){}
      }
      const cdata = ReflectHelper.getOrCreateClassData(TestClass);
      cdata.build();
      
      const mdata = cdata.methods.find(m => m.name === 'method');
      expect(mdata.flags).to.eq(MethodFlags.STATIC);
      expect(mdata.parameters.length).to.eq(3);
      expect(mdata.parameters[0].name).to.eq('y');
      expect(mdata.parameters[1].name).to.eq('z');
      expect(mdata.parameters[2].name).to.eq('t');
   });
   
   it('Should add static properties with "get"', () => {
      class TestClass {
         public static get property(){ return ''; }
      }
      const cdata = ReflectHelper.getOrCreateClassData(TestClass);
      cdata.build();
      const prop = cdata.properties.find(m => m.name === 'property');
      expect(prop).not.be.undefined;
      expect(prop.flags).to.eq(PropertyFlags.STATIC);
   });

   it('Should add static with assign', () => {
      class TestClass {
         public static property = 10;
      }
      const cdata = ReflectHelper.getOrCreateClassData(TestClass);
      cdata.build();
      const prop = cdata.properties.find(m => m.name === 'property');
      expect(prop).not.be.undefined;
      expect(prop.flags).to.eq(PropertyFlags.STATIC);
   });   
});