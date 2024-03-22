namespace bookshop;

entity Books {
    key ID: Integer;
    title: String;
}

entity Authors {
    key ID: Integer;
    name:  String;
}

entity Publishers {
    key ID: Integer;
    name: String;
}