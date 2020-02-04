// eslint-disable-next-line
/// <reference path="../src/defines.d.ts" />
import { expect } from "chai";
import * as sinon from 'sinon';
import { ClassData, ReflectHelper } from "../index";
import { MethodData, ParameterData, PropertyData } from "../src/reflection";

describe('Hooks', () => {
   let classCreatedSpy : any;
   let methodCreatedSpy : any;
   let parameterCreatedSpy : any;
   let propertyCreatedSpy : any;

   function classCreated(cd: ClassData): void {}
   function methodCreated(cd: ClassData, md:MethodData): void {}
   function propertyCreated(cd: ClassData, pd: PropertyData): void {}
   function paramCreated(cd: ClassData, md:MethodData, pd:ParameterData): void {}
   
   before((done) => {
      classCreatedSpy = sinon.spy(classCreated);
      methodCreatedSpy = sinon.spy(methodCreated);
      propertyCreatedSpy = sinon.spy(propertyCreated);
      parameterCreatedSpy = sinon.spy(paramCreated);
      done();
   });
   
   afterEach((done) =>{
      classCreatedSpy.resetHistory();
      methodCreatedSpy.resetHistory();
      propertyCreatedSpy.resetHistory();
      parameterCreatedSpy.resetHistory();
      done();
   })

   
   it('Should call class created', () => {
      class X {}      
      
      ReflectHelper.addHook({onCreateClass: classCreatedSpy});
      ReflectHelper.getOrCreateClassData(X);
      expect(classCreatedSpy.called).to.be.true;
      expect(classCreatedSpy.callCount).to.eq(1);
   })

   it('Should call method created', () => {
      class X {}      
      
      ReflectHelper.addHook({onCreateMethod: methodCreatedSpy});
      const cd = ReflectHelper.getOrCreateClassData(X);
      cd.getOrCreateMethod('MyMethod');
      expect(methodCreatedSpy.called).to.be.true;
      // Constructor + method
      expect(methodCreatedSpy.callCount).to.eq(2); 
   })   

   it('Should call property created', () => {
      class X {}      
      
      ReflectHelper.addHook({onCreateProperty: propertyCreatedSpy});
      const cd = ReflectHelper.getOrCreateClassData(X);
      cd.getOrCreateProperty('MyProperty');
      expect(propertyCreatedSpy.called).to.be.true;
      expect(propertyCreatedSpy.callCount).to.eq(1); 
   })     

   it('Should call parameter created', () => {
      class X {}      
      
      ReflectHelper.addHook({onCreateParameter: parameterCreatedSpy});
      const cd = ReflectHelper.getOrCreateClassData(X);
      const md = cd.getOrCreateMethod('MyProperty');
      md.getOrCreateParameter(0);
      expect(parameterCreatedSpy.called).to.be.true;
      expect(parameterCreatedSpy.callCount).to.eq(1); 
   })      
   
   it('Should call on method processed', () => {
      class X {}  
      let mpspy = sinon.spy();
      ReflectHelper.addHook({onProcessedMethod: mpspy});
      const cd = ReflectHelper.getOrCreateClassData(X);
      cd.getOrCreateMethod('MyMethod1');
      cd.getOrCreateMethod('MyMethod2');
      cd.build();
      expect(mpspy.called).to.be.true;
      // Constructor + 2 methods
      expect(mpspy.callCount).to.eq(3); 
   })    

   it('Should call on class processed', () => {
      class X {}  
      let cdSpy = sinon.spy();
      ReflectHelper.addHook({onProcessedClass: cdSpy});
      const cd = ReflectHelper.getOrCreateClassData(X);
      cd.getOrCreateMethod('MyMethod1');
      cd.getOrCreateMethod('MyMethod2');
      cd.build();
      expect(cdSpy.called).to.be.true;
      // Constructor + 2 methods
      expect(cdSpy.callCount).to.eq(1); 
   })       
});