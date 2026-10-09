export default function AuthField({ label, icon: Icon, invalid = false, ...inputProps }) {
  const id = `auth-${inputProps.name}`;
  return (
    <div className="auth-control">
      <label htmlFor={id}>{label}</label>
      <div className={`field${invalid ? ' field-invalid' : ''}`}>
        <Icon className="input-icon" aria-hidden="true" />
        <input id={id} className="input-field" aria-invalid={invalid || undefined} {...inputProps} />
      </div>
    </div>
  );
}
