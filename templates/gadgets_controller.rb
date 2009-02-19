class <%= @options.plural.capitalize %>Controller < ApplicationController
  def show
    @<%= @options.singular %> = <%= @options.model %>
    respond_to :xml
  end
end
