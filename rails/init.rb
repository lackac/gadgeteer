require File.join(File.dirname(__FILE__), '..', 'lib', 'gadgeteer')

ActionController::Base.send :include, Gadgeteer
