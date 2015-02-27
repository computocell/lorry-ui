'use strict';

describe('Controller: DocumentCtrl', function () {

  // load the controller's module
  beforeEach(module('lorryApp'));

  var DocumentCtrl,
    scope,
    yamlValidator;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope, _yamlValidator_) {
    scope = $rootScope.$new();
    DocumentCtrl = $controller('DocumentCtrl', {
      $scope: scope
    });
    yamlValidator = _yamlValidator_;
  }));

  describe('$scope.validateYaml', function() {

    describe('when validation succeeds', function() {
      var deferredSuccess;

      beforeEach(inject(function($q) {
        deferredSuccess = $q.defer();
        spyOn(yamlValidator, 'validate').and.returnValue(deferredSuccess.promise);
        scope.validateYaml();
        deferredSuccess.resolve({data: {lines: ['line'], errors: ['error']}});
        scope.$digest();
      }));

      it ('adds validation data to the scope', function() {
        expect(scope.yamlDocument.lines).toEqual(['line']);
        expect(scope.yamlDocument.errors).toEqual(['error']);
      });

      it ('builds the service definitions', function() {
        expect(scope.serviceDefinitions).toBeDefined();
        expect(scope.serviceDefinitions).toContain([{ text: 'line', lineNumber: 1, errors: [  ] }]);
      });

      it ('sets the parseErrors flag for message display true', function () {
        expect(scope.yamlDocument.parseErrors).toBe(true);
      });
    });

    describe('when validation fails', function() {
      var deferredError;

      beforeEach(inject(function($q) {
        deferredError = $q.defer();
        spyOn(yamlValidator, 'validate').and.returnValue(deferredError.promise);
      }));

      describe('due to a status other than 500 (e.g. 422)', function () {
        beforeEach(inject(function() {
          scope.validateYaml();
          deferredError.reject({data: {error: 'something went wrong'}});
          scope.$digest();
        }));

        it ('adds the error to the scope', function() {
          expect(scope.yamlDocument.lines).toBeUndefined();
          expect(scope.yamlDocument.errors).toEqual([{error: {message: 'something went wrong'}}]);
        });

        it ('does not build the service definitions', function () {
          expect(scope.serviceDefinitions).toEqual([]);
        });

        it ('sets the parseErrors flag for message display true', function () {
          expect(scope.yamlDocument.loadFailure).toBe(true);
        });
      });

      describe('when validation fails because of a 500 error', function () {
        beforeEach(inject(function() {
          scope.validateYaml();
          deferredError.reject({status: 500, data: {error: 'something went wrong'}});
          scope.$digest();
        }));

        it ('adds an error to yamlDocument.errors indicating internal server error', function () {
          expect(scope.yamlDocument.errors).toEqual([{error: {message: 'An internal server error has occurred'}}]);
        });

        it ('sets the parseErrors flag for message display true', function () {
          expect(scope.yamlDocument.loadFailure).toBe(true);
        });

      });
    });

  });

  describe('$scope.resetWorkspace', function () {
    it('resets the $scope.yamlDocument to an empty object', function () {
      scope.yamlDocument = { foo: 'bar' };
      expect(scope.yamlDocument).toEqual({ foo: 'bar' });
      scope.resetWorkspace();
      expect(scope.yamlDocument).toEqual({});
    });
  });

  describe('yamlDocument.raw watcher', function () {
    beforeEach(function () {
      scope.resettable = false;
      scope.importable = true;
      scope.yamlDocument = {};
    });

    describe('when $scope.yamlDocument.raw is undefined', function () {
      beforeEach(function () {
        scope.yamlDocument.raw = undefined;
        scope.$digest();
      });

      it('sets $scope.resettable false', function () {
        expect(scope.resettable).toBe(false);
      });

      it('sets $scope.importable true', function () {
        expect(scope.importable).toBe(true);
      });
    });

    describe('when $scope.yamlDocument.raw is defined', function () {
      beforeEach(function () {
        scope.yamlDocument.raw = 'asdf';
        scope.$digest();
      });

      it('sets $scope.resettable true', function () {
        expect(scope.resettable).toBe(true);
      });

      it('sets $scope.importable false', function () {
        expect(scope.importable).toBe(false);
      });
    });
  });

  describe('$scope.serviceName', function () {

    it('returns the service name', function () {
      var serviceDef =
        [
          {
            text: 'db:\\n',
            lineNumber: 1,
            errors: [
              { error: { message: 'error1', line: 1, column: 2} }
            ]
          },
          {
            text: '  image: postgres:latest\\n',
            lineNumber: 2,
            errors: [
              { error: { message: 'error2', line: 2, column: 3} }
            ]
          }
        ];

      var sName = scope.serviceName(serviceDef);

      expect(sName).toEqual('db');
    });
  });

  describe('$scope.validateJson', function () {
    describe('when the yamlDocument has no/empty json', function () {
      beforeEach(function () {
        spyOn(scope, 'resetWorkspace');
        spyOn(scope, 'validateYaml');
      });

      it('resets the workspace', function () {
        scope.yamlDocument.json = {};
        scope.validateJson();
        expect(scope.resetWorkspace).toHaveBeenCalled();
      });
    });

    describe('when the yamlDocument has json', function () {
      beforeEach(function () {
        spyOn(scope, 'validateYaml');
        scope.yamlDocument.raw = null;
        scope.yamlDocument.json = {'foo': 'bar'};
        scope.validateJson();
      });

      it('stores the yamlized json into the yamlDocument.raw property', function () {
        expect(scope.yamlDocument.raw).not.toBeNull();
      });

      it('calls validatesYaml', function () {
        expect(scope.validateYaml).toHaveBeenCalled();
      });
    });
  });

  describe('deleteService event handler', function () {
    beforeEach(function () {
      spyOn(scope, 'validateJson');
    });

    describe('when the yamlDocument.json has a service matching the serviceName in the event', function () {
      beforeEach(function () {
        scope.yamlDocument.json = { someService: [] };
        scope.$emit('deleteService', 'someService');
      });

      it('should not change the yamlDocument.json', function () {
        expect(scope.yamlDocument.json).toEqual({});
      });

      it('should not call validateJson', function () {
        expect(scope.validateJson).toHaveBeenCalled();
      });
    });

    describe('when the yamlDocument.json does not have a service matching the serviceName in the event', function () {
      beforeEach(function () {
        scope.yamlDocument.json = { someOtherService: [] };
        scope.$emit('deleteService', 'someService');
      });

      it('should not change the yamlDocument.json', function () {
        expect(scope.yamlDocument.json).toEqual({ someOtherService: [] });
      });

      it('should not call validateJson', function () {
        expect(scope.validateJson).not.toHaveBeenCalled();
      });
    });
  });

  describe('$scope.validateJson', function () {
    describe('when the yamlDocument has no/empty json', function () {
      beforeEach(function () {
        spyOn(scope, 'resetWorkspace');
        spyOn(scope, 'validateYaml');
      });

      it('resets the workspace', function () {
        scope.yamlDocument.json = {};
        scope.validateJson();
        expect(scope.resetWorkspace).toHaveBeenCalled();
      });
    });

    describe('when the yamlDocument has json', function () {
      beforeEach(function () {
        spyOn(scope, 'validateYaml');
        scope.yamlDocument.raw = null;
        scope.yamlDocument.json = {'foo': 'bar'};
        scope.validateJson();
      });

      it('stores the yamlized json into the yamlDocument.raw property', function () {
        expect(scope.yamlDocument.raw).not.toBeNull();
      });

      it('calls validatesYaml', function () {
        expect(scope.validateYaml).toHaveBeenCalled();
      });
    });
  });

  describe('deleteService event handler', function () {
    beforeEach(function () {
      spyOn(scope, 'validateJson');
    });

    describe('when the yamlDocument.json has a service matching the serviceName in the event', function () {
      beforeEach(function () {
        scope.yamlDocument.json = { someService: [] };
        scope.$emit('deleteService', 'someService');
      });

      it('should not change the yamlDocument.json', function () {
        expect(scope.yamlDocument.json).toEqual({});
      });

      it('should not call validateJson', function () {
        expect(scope.validateJson).toHaveBeenCalled();
      });
    });

    describe('when the yamlDocument.json does not have a service matching the serviceName in the event', function () {
      beforeEach(function () {
        scope.yamlDocument.json = { someOtherService: [] };
        scope.$emit('deleteService', 'someService');
      });

      it('should not change the yamlDocument.json', function () {
        expect(scope.yamlDocument.json).toEqual({ someOtherService: [] });
      });

      it('should not call validateJson', function () {
        expect(scope.validateJson).not.toHaveBeenCalled();
      });
    });
  });

});